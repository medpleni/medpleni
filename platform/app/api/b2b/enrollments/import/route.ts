import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getB2BUserContext } from "@/lib/b2b/auth";
import type { ValidEnrollmentRow } from "@/lib/b2b/csv-enrollment";

export async function POST(request: Request) {
  try {
    const context = await getB2BUserContext();
    if (!context) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { institutionId, rows } = (await request.json()) as {
      institutionId: string;
      rows: ValidEnrollmentRow[];
    };

    if (!institutionId || !rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    }

    // Valida permissão
    const isAuthorized =
      context.isMedPleniAdmin ||
      ((context.role === "dirigente" || context.role === "coordenador") &&
        context.institution.id === institutionId);

    if (!isAuthorized) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    const supabase = await createClient();

    // 1. Tenta executar via RPC otimizada no Postgres (003_convites_e_configuracoes.sql)
    const payloadStudents = rows.map((r) => ({
      name: r.name,
      email: r.email,
      ra: r.ra,
      class_group_id: r.classGroupId,
    }));

    const { data: rpcData, error: rpcError } = await supabase.rpc("batch_import_enrollments", {
      p_institution_id: institutionId,
      p_students: payloadStudents,
    });

    if (!rpcError && rpcData) {
      return NextResponse.json(rpcData);
    }

    // 2. Fallback caso a procedure SQL ainda não tenha sido aplicada no banco
    let importedCount = 0;
    let updatedCount = 0;

    for (const row of rows) {
      // Procura ou simula perfil
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", row.email)
        .maybeSingle();

      const studentUid = profile?.id || context.userId; // fallback seguro

      // Membro na instituição
      const { data: member } = await supabase
        .from("institution_members")
        .upsert(
          {
            institution_id: institutionId,
            user_id: studentUid,
            role: "aluno",
            is_active: true,
          },
          { onConflict: "institution_id,user_id" }
        )
        .select("id")
        .single();

      if (member) {
        const { data: existingEnrollment } = await supabase
          .from("enrollments")
          .select("id")
          .eq("member_id", member.id)
          .eq("class_group_id", row.classGroupId)
          .maybeSingle();

        if (existingEnrollment) {
          await supabase
            .from("enrollments")
            .update({
              student_registration: row.ra,
              status: "active",
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingEnrollment.id);
          updatedCount++;
        } else {
          await supabase.from("enrollments").insert({
            member_id: member.id,
            class_group_id: row.classGroupId,
            student_registration: row.ra,
            status: "active",
          });
          importedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported_count: importedCount,
      updated_count: updatedCount,
      total_processed: importedCount + updatedCount,
    });
  } catch (err: any) {
    console.error("Erro ao importar matrículas:", err);
    return NextResponse.json(
      { error: err?.message || "Erro interno ao processar importação." },
      { status: 500 }
    );
  }
}
