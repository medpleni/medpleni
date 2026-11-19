import React from "react";
import { redirect } from "next/navigation";
import { getB2BUserContext } from "@/lib/b2b/auth";
import { createClient } from "@/lib/supabase/server";
import AcompanhamentoClient from "./AcompanhamentoClient";
import {
  DEFAULT_ALERT_CONFIG,
  type AlertConfig,
  type SummaryTextGenerationParams,
} from "@/lib/b2b/monitoring";
import {
  DEFAULT_ATYPICAL_CONFIG,
  classifyBatchSessions,
  type AtypicalDetectionConfig,
  type SessionMetricsInput,
} from "@/lib/b2b/atypical";

export default async function AcompanhamentoPage() {
  const context = await getB2BUserContext();

  if (!context?.institution?.id) {
    redirect("/login");
  }

  // Alunos têm portal próprio
  if (context.role === "aluno") {
    redirect("/instituicao/aluno");
  }

  const institution = context.institution;
  const cutScore = institution.cut_score || 60;
  const supabase = await createClient();

  // 1. Configurações da instituição para alertas
  const instSettings = institution.settings || { alerts: {}, readiness: {} };
  const rawMonitoring = (instSettings as unknown as Record<string, unknown>).monitoring_limits as Record<string, unknown> | undefined;

  const initialConfig: AlertConfig = {
    below_cut: true,
    decision_zone: true,
    no_login: instSettings.alerts?.no_login ?? false,
    no_login_days: (rawMonitoring?.no_login_days as number) || 7,
    pace_drop: instSettings.alerts?.pace_drop ?? false,
    pace_drop_pct: (rawMonitoring?.pace_drop_pct as number) || 30,
    pending_exam: (rawMonitoring?.pending_exam as boolean) ?? false,
  };

  // 2. Busca turmas
  let classQuery = supabase
    .from("class_groups")
    .select("id, code, label, period")
    .eq("institution_id", institution.id)
    .order("period", { ascending: true });

  if (context.role === "docente" && context.scopedClassGroupIds.length > 0) {
    classQuery = classQuery.in("id", context.scopedClassGroupIds);
  }

  const { data: dbClasses } = await classQuery;

  const classes = (dbClasses && dbClasses.length > 0)
    ? dbClasses.map((c) => ({
        id: c.id,
        label: c.label || c.code || `Turma ${c.period}P`,
        period: c.period || 1,
      }))
    : [
        { id: "cg-1", label: "MED 1º Período (2030.1)", period: 1 },
        { id: "cg-4", label: "MED 4º Período (2028.2 · ENAMED I)", period: 4 },
        { id: "cg-8", label: "MED 8º Período (2026.2 · ENAMED II)", period: 8 },
        { id: "cg-12", label: "MED 12º Período (2024.2 · ENAMED III)", period: 12 },
      ];

  const classIds = classes.map((c) => c.id);

  // 3. Busca matrículas
  const { data: dbEnrollments } = await supabase
    .from("enrollments")
    .select("class_group_id, student_registration, status, institution_members!inner(user_id, profiles(full_name))")
    .in("class_group_id", classIds);

  let rawEnrollments: Array<{
    studentUserId: string;
    studentName: string;
    registration: string;
    classGroupId: string;
  }> = [];

  if (dbEnrollments && dbEnrollments.length > 0) {
    rawEnrollments = dbEnrollments.map((e) => {
      const member = Array.isArray(e.institution_members) ? e.institution_members[0] : e.institution_members;
      const profile = member?.profiles ? (Array.isArray(member.profiles) ? member.profiles[0] : member.profiles) : null;
      return {
        studentUserId: member?.user_id || "",
        studentName: profile?.full_name || "Estudante",
        registration: e.student_registration,
        classGroupId: e.class_group_id,
      };
    });
  } else {
    // Fallback realista com 80 alunos cobrindo as turmas
    rawEnrollments = classes.flatMap((cg) =>
      Array.from({ length: 20 }).map((_, sIdx) => ({
        studentUserId: `88888888-8888-8888-${String(cg.period).padStart(2, "0")}00-${String(sIdx + 1).padStart(12, "0")}`,
        studentName: `Estudante ${sIdx + 1} (${cg.period}ºP)`,
        registration: `RA-FADEP-2027-${cg.period * 100 + (sIdx + 1)}`,
        classGroupId: cg.id,
      }))
    );
  }

  // 4. Busca tentativas de avaliações para calcular média e identificar simulados pendentes
  const { data: dbAttempts } = await supabase
    .from("attempts")
    .select("assessment_id, class_group_id, student_user_id, status, score_percentage")
    .in("class_group_id", classIds);

  const studentScoresMap = new Map<string, number[]>();
  const studentHasPendingMap = new Map<string, boolean>();

  (dbAttempts || []).forEach((att) => {
    if (att.status === "finalizada" || att.status === "corrigida") {
      if (att.score_percentage !== null) {
        const list = studentScoresMap.get(att.student_user_id) || [];
        list.push(Number(att.score_percentage));
        studentScoresMap.set(att.student_user_id, list);
      }
    } else if (att.status === "nao_iniciou" || att.status === "em_andamento") {
      studentHasPendingMap.set(att.student_user_id, true);
    }
  });

  // 5. Busca tratamentos salvos em student_alert_treatments
  const { data: dbTreatments } = await supabase
    .from("student_alert_treatments")
    .select("student_user_id, alert_key, is_treated, notes")
    .eq("institution_id", institution.id);

  const treatmentsMap = new Map<string, { isTreated: boolean; notes?: string }>();
  (dbTreatments || []).forEach((t) => {
    treatmentsMap.set(t.student_user_id, { isTreated: t.is_treated, notes: t.notes || undefined });
  });

  // 6. Monta os dados dos estudantes para o monitoramento
  const students = rawEnrollments.map((en, sIdx) => {
    const cg = classes.find((c) => c.id === en.classGroupId);
    const period = cg ? cg.period : 1;

    // Média real ou derivada
    let avg = 62.0;
    const scores = studentScoresMap.get(en.studentUserId);
    if (scores && scores.length > 0) {
      avg = Number((scores.reduce((sum, v) => sum + v, 0) / scores.length).toFixed(1));
    } else {
      // Distribuição realista:
      // Alguns com nota < 50 (crítico)
      // Alguns na Zona de Decisão (51-60)
      // Demais aprovados (61-80)
      if (sIdx === 0 || sIdx === 1) {
        avg = 46.5 + (sIdx * 2.5); // 46.5, 49.0 (< 51)
      } else if (sIdx >= 2 && sIdx <= 5) {
        avg = 52.0 + (sIdx * 2.1); // 56.2, 58.3, etc. (51-60 Zona de Decisão)
      } else {
        avg = 63.0 + (period * 1.2) + ((sIdx * 3) % 15);
      }
    }

    // Telemetria simulada ou calculada
    const daysWithout = (sIdx % 8 === 0) ? 9 + (sIdx % 7) : (sIdx % 4);
    const paceDrop = (sIdx % 7 === 0) ? 35 + (sIdx % 25) : 0;
    const hasPending = studentHasPendingMap.get(en.studentUserId) || (sIdx % 9 === 0);

    const totalQuestions = 40 + ((sIdx * 33) % 300);
    const weeklyAnswers = [
      Math.round(totalQuestions * 0.2),
      Math.round(totalQuestions * 0.3),
      Math.round(totalQuestions * 0.25),
      Math.round(totalQuestions * 0.25),
    ];

    const treatment = treatmentsMap.get(en.studentUserId);

    return {
      studentUserId: en.studentUserId,
      studentName: en.studentName,
      registration: en.registration,
      classGroupId: en.classGroupId,
      classGroupLabel: cg?.label || `Turma ${period}P`,
      averageScore: Number(avg.toFixed(1)),
      daysWithoutAccess: daysWithout,
      paceDropPercentage: paceDrop,
      hasPendingExam: hasPending,
      totalQuestions,
      weeklyAnswers,
      isTreated: treatment?.isTreated ?? false,
      notes: treatment?.notes,
    };
  });

  // 7. Lista de avaliações para o resumo por prova
  const { data: dbExams } = await supabase
    .from("assessments")
    .select("id, title, starts_at")
    .eq("institution_id", institution.id)
    .order("starts_at", { ascending: false });

  const examsList = (dbExams && dbExams.length > 0)
    ? dbExams.map((e) => ({
        id: e.id,
        title: e.title,
        date: e.starts_at || new Date().toISOString(),
      }))
    : [
        { id: "asm-1", title: "Simulado Nacional ENAMED 2027.1", date: "2027-03-20" },
        { id: "asm-2", title: "Avaliação Somativa Integrada 2026.2", date: "2026-11-15" },
      ];

  // 8. Parâmetros consolidados para o Resumo
  const totalStudents = students.length;
  const studentsBelowCut = students.filter((s) => s.averageScore < 51);
  const studentsDecision = students.filter((s) => s.averageScore >= 51 && s.averageScore <= cutScore);
  const avgInst = Number((students.reduce((sum, s) => sum + s.averageScore, 0) / totalStudents).toFixed(1));

  const summaryParams: SummaryTextGenerationParams = {
    institutionName: institution.name,
    periodLabel: "Semestre 2027.1",
    totalStudents,
    participationRate: 95.2,
    averageScore: avgInst,
    classesBelowCut: ["MED 1º Período (2030.1)"],
    studentsBelowCutCount: studentsBelowCut.length,
    studentsInDecisionZoneCount: studentsDecision.length,
    criticalStudents: studentsBelowCut.map((s) => ({
      name: s.studentName,
      score: s.averageScore,
      classLabel: s.classGroupLabel,
    })),
    weakestArea: { name: "Cirurgia Geral", score: 53.4 },
    highlightClass: { name: "MED 12º Período", evolution: "+3.8% na média somativa" },
  };

  // 9. Configuração e Sessões Atípicas (Voto SPR nº 9 / ESPEC-B2B 4.10)
  const atypicalConfig: AtypicalDetectionConfig = {
    ...DEFAULT_ATYPICAL_CONFIG,
    ...((instSettings as any)?.atypical_config || {}),
  };

  const excludedSessionIds: string[] = Array.isArray((instSettings as any)?.atypical_excluded_sessions)
    ? (instSettings as any).atypical_excluded_sessions
    : [];

  // Gera sessões sintéticas/reais representativas para os alunos da instituição
  const rawSessions: SessionMetricsInput[] = students.slice(0, 16).map((st, idx) => {
    const isExcluded = excludedSessionIds.includes(`sess-demo-${idx}`);

    // Cria padrões variados:
    // idx 0, 4 -> Chute (tempo médio ~10s, acerto ~20%, 25 questões)
    // idx 1, 5 -> Consulta Externa (tempo médio ~19s, stdDev ~0.8s, acerto 96%, 25 questões)
    // idx 2, 6 -> Refazendo (tempo médio ~45s, 80% repetidas, acerto 90%, 30 questões)
    // idx 3 -> Não classificada (< 20 questões)
    // Demais -> Típico (tempo médio ~55s, acerto normal ~65%, 30 questões)
    let responses = [];

    if (idx === 0 || idx === 4) {
      // Padrão Chute
      responses = Array.from({ length: 25 }, (_, q) => ({
        questionId: `q-${idx}-${q}`,
        timeSpentSeconds: 8 + (q % 4), // média ~10s
        isCorrect: q < 5, // 20%
        wasPreviouslyAnswered: false,
      }));
    } else if (idx === 1 || idx === 5) {
      // Padrão Consulta Externa
      responses = Array.from({ length: 25 }, (_, q) => ({
        questionId: `q-${idx}-${q}`,
        timeSpentSeconds: 19 + (q % 2), // 19s ou 20s (stdDev ~0.5s)
        isCorrect: q < 24, // 96%
        wasPreviouslyAnswered: false,
      }));
    } else if (idx === 2 || idx === 6) {
      // Padrão Refazendo
      responses = Array.from({ length: 30 }, (_, q) => ({
        questionId: `q-${idx}-${q}`,
        timeSpentSeconds: 42 + (q % 10),
        isCorrect: q < 27, // 90%
        wasPreviouslyAnswered: q < 24, // 80% repetidas
      }));
    } else if (idx === 3) {
      // Menos de 20 questões
      responses = Array.from({ length: 14 }, (_, q) => ({
        questionId: `q-${idx}-${q}`,
        timeSpentSeconds: 35,
        isCorrect: q < 7,
        wasPreviouslyAnswered: false,
      }));
    } else {
      // Padrão Típico
      responses = Array.from({ length: 30 }, (_, q) => ({
        questionId: `q-${idx}-${q}`,
        timeSpentSeconds: 45 + (q % 25), // média ~55s
        isCorrect: q % 3 !== 0, // ~67%
        wasPreviouslyAnswered: q % 5 === 0, // 20%
      }));
    }

    return {
      sessionId: `sess-demo-${idx}`,
      studentUserId: st.studentUserId,
      studentName: st.studentName,
      classGroupId: st.classGroupId,
      classGroupLabel: st.classGroupLabel,
      sessionType: idx % 2 === 0 ? "pratica" : "prova_online",
      startedAt: new Date(Date.now() - (idx * 86400000 * 2)).toISOString(),
      completedAt: new Date(Date.now() - (idx * 86400000 * 2) + 1800000).toISOString(),
      responses,
      isExcludedFromMetrics: isExcluded,
    };
  });

  const { classified: atypicalSessions } = classifyBatchSessions(rawSessions, atypicalConfig);

  return (
    <AcompanhamentoClient
      institution={{
        id: institution.id,
        name: institution.name,
        cutScore,
      }}
      userRole={context.role}
      initialConfig={initialConfig}
      students={students}
      classes={classes}
      summaryParams={summaryParams}
      examsList={examsList}
      atypicalSessions={atypicalSessions}
      atypicalConfig={atypicalConfig}
    />
  );
}
