import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase().trim() || "";
    const planFilter = searchParams.get("plan") || "Todos";

    // Client admin com service role key se disponível para ignorar RLS
    let adminSupabase = supabase;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
      const { createClient: createAdminSupabase } = await import("@supabase/supabase-js");
      adminSupabase = createAdminSupabase(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
    }

    // 1. Busca todos os perfis cadastrados
    const { data: profiles, error: pErr } = await adminSupabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (pErr) {
      console.warn("Aviso ao buscar profiles no backend admin:", pErr.message);
    }

    // 2. Busca todos os convites registrados
    const { data: invitations, error: iErr } = await adminSupabase
      .from("admin_invitations")
      .select("*")
      .order("created_at", { ascending: false });

    if (iErr) {
      console.warn("Aviso ao buscar convites no backend admin:", iErr.message);
    }

    // 3. Mapa de consolidação indexado por e-mail em minúsculas
    const studentMap = new Map<string, any>();

    // Popula com perfis existentes
    for (const p of profiles || []) {
      const cleanEmail = (p.email || "").toLowerCase().trim();
      if (!cleanEmail) continue;

      studentMap.set(cleanEmail, {
        id: p.id,
        fullName: p.full_name || "Médico(a) Aluno(a)",
        email: p.email,
        crm: p.crm || undefined,
        role: p.role || "student",
        plan: p.plan || p.plano || "diagnostico",
        status: p.status || "active",
        blockedReason: p.blocked_reason || undefined,
        accessExpiresAt: p.access_expires_at || undefined,
        subBrand: p.sub_brand || "RESID",
        lastActiveAt: p.last_active_at || undefined,
        specialty: p.target_specialty || p.specialty || undefined,
        targetExams: p.target_exams && p.target_exams.length > 0 ? p.target_exams : ["ENAMED"],
        weeklyHours: p.weekly_study_hours || 20,
        streakDays: p.streak_days || 0,
        createdAt: p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "—",
        questionsAnsweredCount: p.questions_answered_count || 0,
        simulationsCompletedCount: p.simulations_completed_count || 0,
      });
    }

    // Mescla convites aceitos ou ativos, garantindo que apareçam na base de alunos
    for (const inv of invitations || []) {
      const cleanEmail = (inv.email || "").toLowerCase().trim();
      if (!cleanEmail) continue;

      if (studentMap.has(cleanEmail)) {
        // Enriquece perfil existente com dados do convite se estiverem faltando
        const existing = studentMap.get(cleanEmail);
        if (!existing.accessExpiresAt && inv.access_expires_at) {
          existing.accessExpiresAt = inv.access_expires_at;
        }
        if (!existing.subBrand && inv.sub_brand) {
          existing.subBrand = inv.sub_brand;
        }
        if (inv.status === "accepted" && existing.status !== "blocked") {
          existing.status = "active";
        }
        if (inv.plan && existing.plan === "diagnostico") {
          existing.plan = inv.plan;
        }
      } else if (inv.status === "accepted" || inv.role === "student") {
        // Se o convite está aceito ou é um aluno convidado, adiciona na base
        studentMap.set(cleanEmail, {
          id: inv.id,
          fullName: inv.full_name || "Médico(a) Aluno(a)",
          email: inv.email,
          role: inv.role || "student",
          plan: inv.plan || "pleno_anual",
          status: inv.status === "revoked" ? "blocked" : "active",
          accessExpiresAt: inv.access_expires_at || undefined,
          subBrand: inv.sub_brand || "RESID",
          targetExams: ["ENAMED"],
          weeklyHours: 20,
          streakDays: 0,
          createdAt: inv.created_at ? new Date(inv.created_at).toLocaleDateString("pt-BR") : "—",
          questionsAnsweredCount: 0,
          simulationsCompletedCount: 0,
        });
      }
    }

    // 4. Aplica filtros de pesquisa e plano
    let resultList = Array.from(studentMap.values());

    if (search) {
      resultList = resultList.filter((s) => {
        return (
          s.fullName?.toLowerCase().includes(search) ||
          s.email?.toLowerCase().includes(search) ||
          s.crm?.includes(search)
        );
      });
    }

    if (planFilter && planFilter !== "Todos") {
      resultList = resultList.filter((s) => {
        if (planFilter === "Gratuito") return s.plan === "diagnostico";
        if (planFilter === "Pleno Mensal") return s.plan === "pleno_mensal";
        if (planFilter === "Pleno Anual") return s.plan === "pleno_anual";
        return s.plan === planFilter;
      });
    }

    return NextResponse.json({
      success: true,
      students: resultList,
      total: resultList.length,
    });
  } catch (err: any) {
    console.error("Erro na rota GET /api/admin/students:", err);
    return NextResponse.json(
      { error: err?.message || "Erro interno do servidor", students: [] },
      { status: 500 }
    );
  }
}
