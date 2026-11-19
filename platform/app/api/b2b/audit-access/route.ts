import { NextResponse, type NextRequest } from "next/server";
import { logIndividualStudentAccess } from "@/lib/b2b/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { institutionId, actorId, actorRole, studentUserId, screenViewed, details } = body;

    if (!institutionId || !actorId || !studentUserId || !actorRole) {
      return NextResponse.json({ error: "Parâmetros incompletos" }, { status: 400 });
    }

    await logIndividualStudentAccess({
      institutionId,
      actorId,
      actorRole,
      studentUserId,
      screenViewed: screenViewed || "perfil_estudante_individual",
      details,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erro interno" }, { status: 500 });
  }
}
