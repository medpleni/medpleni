/**
 * MEDPLENI B2B — monitoring.ts
 * Funções puras e cálculos para Acompanhamento, Alertas, Meta Semanal e Resumo (Votos SPR nº 1 a 7)
 */

export type AlertKey =
  | "nota_abaixo_60"
  | "zona_decisao"
  | "sem_acesso"
  | "queda_ritmo"
  | "simulado_pendente";

export interface AlertConfig {
  below_cut: boolean; // Sempre ligado
  decision_zone: boolean; // Sempre ligado
  no_login: boolean; // Desligado por padrão
  no_login_days: number; // Padrão: 7 dias
  pace_drop: boolean; // Desligado por padrão
  pace_drop_pct: number; // Padrão: 30%
  pending_exam: boolean; // Desligado por padrão
}

export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  below_cut: true,
  decision_zone: true,
  no_login: false,
  no_login_days: 7,
  pace_drop: false,
  pace_drop_pct: 30,
  pending_exam: false,
};

export interface AlertReasonItem {
  key: AlertKey;
  label: string;
  severity: "critical" | "warning" | "info";
  detail: string;
  weight: number; // 1 mais urgente (nota < 60), 5 menor (simulado)
}

export interface AttentionStudentItem {
  studentUserId: string;
  studentName: string;
  registration: string;
  classGroupId: string;
  classGroupLabel: string;
  averageScore: number;
  reasons: AlertReasonItem[];
  daysWithoutAccess: number;
  paceDropPercentage: number;
  hasPendingExam: boolean;
  isTreated: boolean;
  notes?: string;
}

export interface ClassAggregatedAlert {
  classGroupId: string;
  classGroupLabel: string;
  alertKey: AlertKey;
  affectedCount: number;
  totalClassStudents: number;
  affectedPercentage: number;
  title: string;
  description: string;
}

export interface WeeklyGoalStudentRow {
  studentUserId: string;
  studentName: string;
  registration: string;
  classGroupLabel: string;
  weeks: Array<{
    weekNumber: number;
    weekLabel: string;
    questionsCount: number;
    target: number;
    status: "cumpriu" | "parcial" | "nao_cumpriu" | "inativo";
  }>;
  consecutiveWeeksMissed: number;
}

export interface SummaryTextGenerationParams {
  institutionName: string;
  periodLabel: string;
  totalStudents: number;
  participationRate: number;
  averageScore: number;
  classesBelowCut: string[];
  studentsBelowCutCount: number;
  studentsInDecisionZoneCount: number;
  criticalStudents: Array<{ name: string; score: number; classLabel: string }>;
  weakestArea?: { name: string; score: number };
  highlightClass?: { name: string; evolution: string };
  includeStudentNames?: boolean;
  isExamSpecific?: boolean;
  examTitle?: string;
}

/**
 * 1. Calcula a Lista Priorizada "Quem precisa de você agora" (Voto SPR nº 1)
 * Regra explícita de ordenação:
 * 1º Motivo mais severo (nota < 60 > zona de decisão > sem acesso > queda de ritmo > simulado pendente)
 * 2º Menor nota média
 * 3º Maior número de dias sem acesso
 */
export function calculateAttentionList(params: {
  students: Array<{
    studentUserId: string;
    studentName: string;
    registration: string;
    classGroupId: string;
    classGroupLabel: string;
    averageScore: number;
    daysWithoutAccess: number;
    paceDropPercentage: number;
    hasPendingExam: boolean;
    isTreated?: boolean;
    notes?: string;
  }>;
  config: AlertConfig;
  cutScore?: number;
}): AttentionStudentItem[] {
  const { students, config, cutScore = 60 } = params;

  const result: AttentionStudentItem[] = [];

  students.forEach((st) => {
    const reasons: AlertReasonItem[] = [];

    // 1. Nota crítica abaixo do corte (< 51%)
    if (config.below_cut && st.averageScore < 51) {
      reasons.push({
        key: "nota_abaixo_60",
        label: "Nota Abaixo de 60% (Crítico)",
        severity: "critical",
        detail: `Média atual de ${st.averageScore.toFixed(1)}% (abaixo do corte de ${cutScore}%)`,
        weight: 1,
      });
    }

    // 2. Zona de Decisão 51 a 60% (SEMPRE LIGADO)
    if (config.decision_zone && st.averageScore >= 51 && st.averageScore <= cutScore) {
      reasons.push({
        key: "zona_decisao",
        label: "Zona de Decisão (51–60%)",
        severity: "warning",
        detail: `Rendimento em ${st.averageScore.toFixed(1)}% · Prioridade de alavancagem pedagógica`,
        weight: 2,
      });
    }

    // 3. Sem Acesso (somente se alerta ligado pelo coordenador)
    if (config.no_login && st.daysWithoutAccess >= config.no_login_days) {
      reasons.push({
        key: "sem_acesso",
        label: `Sem Acesso há ${st.daysWithoutAccess} dias`,
        severity: "warning",
        detail: `Sem login na plataforma há ${st.daysWithoutAccess} dias (limite: ${config.no_login_days} dias)`,
        weight: 3,
      });
    }

    // 4. Queda de Ritmo (somente se alerta ligado)
    if (config.pace_drop && st.paceDropPercentage >= config.pace_drop_pct) {
      reasons.push({
        key: "queda_ritmo",
        label: `Queda de Ritmo (-${st.paceDropPercentage}%)`,
        severity: "info",
        detail: `Redução de ${st.paceDropPercentage}% no volume de questões de treino em relação à semana anterior`,
        weight: 4,
      });
    }

    // 5. Simulado Pendente (somente se alerta ligado)
    if (config.pending_exam && st.hasPendingExam) {
      reasons.push({
        key: "simulado_pendente",
        label: "Simulado Pendente",
        severity: "info",
        detail: "Avaliação somativa convocada não iniciada na janela de aplicação",
        weight: 5,
      });
    }

    // Só entra na lista se houver pelo menos um motivo ativo
    if (reasons.length > 0) {
      // Ordena razões internas por peso
      reasons.sort((a, b) => a.weight - b.weight);

      result.push({
        studentUserId: st.studentUserId,
        studentName: st.studentName,
        registration: st.registration,
        classGroupId: st.classGroupId,
        classGroupLabel: st.classGroupLabel,
        averageScore: st.averageScore,
        reasons,
        daysWithoutAccess: st.daysWithoutAccess,
        paceDropPercentage: st.paceDropPercentage,
        hasPendingExam: st.hasPendingExam,
        isTreated: st.isTreated ?? false,
        notes: st.notes,
      });
    }
  });

  // Ordenação prioritária composta
  return result.sort((a, b) => {
    // Tratados vão para o final
    if (a.isTreated !== b.isTreated) {
      return a.isTreated ? 1 : -1;
    }

    // 1. Menor peso do motivo principal (mais urgente primeiro)
    const weightA = a.reasons[0]?.weight ?? 99;
    const weightB = b.reasons[0]?.weight ?? 99;
    if (weightA !== weightB) {
      return weightA - weightB;
    }

    // 2. Menor nota média
    if (Math.abs(a.averageScore - b.averageScore) > 0.1) {
      return a.averageScore - b.averageScore;
    }

    // 3. Mais dias sem acesso
    return b.daysWithoutAccess - a.daysWithoutAccess;
  });
}

/**
 * 2. Agregação Inteligente de Alertas de Turma (Voto SPR nº 2)
 * Se um alerta atingir >= thresholdPct (padrão 50%) dos alunos da turma,
 * vira um único "Alerta de Turma".
 */
export function aggregateClassAlerts(params: {
  attentionList: AttentionStudentItem[];
  classTotalStudents: Map<string, number>; // classGroupId -> totalStudents
  thresholdPct?: number; // Padrão 50%
}): {
  classAlerts: ClassAggregatedAlert[];
  individualAttentionList: AttentionStudentItem[];
} {
  const { attentionList, classTotalStudents, thresholdPct = 50 } = params;

  // Mapeia turma + alertKey -> count
  const classAlertCounts = new Map<string, { count: number; label: string; classLabel: string }>();

  attentionList.forEach((st) => {
    st.reasons.forEach((r) => {
      const key = `${st.classGroupId}__${r.key}`;
      const cur = classAlertCounts.get(key) || { count: 0, label: r.label, classLabel: st.classGroupLabel };
      cur.count += 1;
      classAlertCounts.set(key, cur);
    });
  });

  const classAlerts: ClassAggregatedAlert[] = [];
  const aggregatedKeys = new Set<string>(); // "classGroupId__alertKey"

  classAlertCounts.forEach((stat, key) => {
    const [classGroupId, alertKey] = key.split("__") as [string, AlertKey];
    const total = classTotalStudents.get(classGroupId) || 20;
    const pct = total > 0 ? (stat.count / total) * 100 : 0;

    if (pct >= thresholdPct) {
      aggregatedKeys.add(key);
      classAlerts.push({
        classGroupId,
        classGroupLabel: stat.classLabel,
        alertKey,
        affectedCount: stat.count,
        totalClassStudents: total,
        affectedPercentage: Number(pct.toFixed(1)),
        title: `Alerta Coletivo da Turma: ${stat.label}`,
        description: `${stat.count} dos ${total} alunos (${pct.toFixed(0)}%) apresentam esta sinalização. Recomendada intervenção pedagógica direta com o grupo.`,
      });
    }
  });

  // Remove motivos agregados dos alunos individuais para não poluir
  const individualAttentionList: AttentionStudentItem[] = attentionList
    .map((st) => {
      const remainingReasons = st.reasons.filter(
        (r) => !aggregatedKeys.has(`${st.classGroupId}__${r.key}`)
      );
      return {
        ...st,
        reasons: remainingReasons,
      };
    })
    .filter((st) => st.reasons.length > 0);

  return { classAlerts, individualAttentionList };
}

/**
 * 3. Alunos na Zona de Decisão (51 a 60%) (EX-04, Voto SPR nº 1)
 */
export function getDecisionZoneStudents(
  students: Array<{
    studentUserId: string;
    studentName: string;
    registration: string;
    classGroupId: string;
    classGroupLabel: string;
    averageScore: number;
    totalQuestions: number;
  }>,
  selectedClassGroupId?: string
) {
  const filtered = selectedClassGroupId && selectedClassGroupId !== "all"
    ? students.filter((s) => s.classGroupId === selectedClassGroupId)
    : students;

  return filtered
    .filter((s) => s.averageScore >= 51 && s.averageScore <= 60)
    .sort((a, b) => a.averageScore - b.averageScore);
}

/**
 * 4. Grade da Meta Semanal de Questões (Voto SPR nº 4)
 * Aluno × Semana: cumpriu, parcial, não cumpriu, inativo
 */
export function calculateWeeklyGoalGrid(params: {
  students: Array<{
    studentUserId: string;
    studentName: string;
    registration: string;
    classGroupLabel: string;
    weeklyAnswers: number[]; // Array de questões respondidas por semana (ex: [60, 45, 10, 0])
  }>;
  weeklyTarget?: number; // Padrão: 50 questões/semana
  weeksLabels?: string[];
}): WeeklyGoalStudentRow[] {
  const { students, weeklyTarget = 50, weeksLabels = ["Semana 1", "Semana 2", "Semana 3", "Semana 4"] } = params;

  return students.map((st) => {
    let consecutiveMissed = 0;
    let countingConsecutive = true;

    const weeks = weeksLabels.map((weekLabel, idx) => {
      const count = st.weeklyAnswers[idx] || 0;
      let status: "cumpriu" | "parcial" | "nao_cumpriu" | "inativo";

      if (count >= weeklyTarget) {
        status = "cumpriu";
      } else if (count >= weeklyTarget * 0.5) {
        status = "parcial";
      } else if (count > 0) {
        status = "nao_cumpriu";
      } else {
        status = "inativo";
      }

      return {
        weekNumber: idx + 1,
        weekLabel,
        questionsCount: count,
        target: weeklyTarget,
        status,
      };
    });

    // Contagem de semanas consecutivas sem cumprir a partir da semana mais recente
    for (let i = weeks.length - 1; i >= 0; i--) {
      if (weeks[i].status !== "cumpriu") {
        if (countingConsecutive) consecutiveMissed++;
      } else {
        countingConsecutive = false;
      }
    }

    return {
      studentUserId: st.studentUserId,
      studentName: st.studentName,
      registration: st.registration,
      classGroupLabel: st.classGroupLabel,
      weeks,
      consecutiveWeeksMissed: consecutiveMissed,
    };
  }).sort((a, b) => b.consecutiveWeeksMissed - a.consecutiveWeeksMissed);
}

/**
 * 5. Gerador de Resumo da Semana em Texto Puro para WhatsApp e E-mail (Voto SPR nº 5 e 7)
 * Regras determinísticas sem IA generativa.
 * Por padrão NÃO inclui nomes de alunos (critério de aceite).
 */
export function generateWeeklySummaryText(params: SummaryTextGenerationParams): string {
  const {
    institutionName,
    periodLabel,
    totalStudents,
    participationRate,
    averageScore,
    classesBelowCut,
    studentsBelowCutCount,
    studentsInDecisionZoneCount,
    criticalStudents,
    weakestArea,
    highlightClass,
    includeStudentNames = false,
    isExamSpecific = false,
    examTitle,
  } = params;

  const headerTitle = isExamSpecific
    ? `[MEDPLENI] RESUMO DA AVALIAÇÃO PARA A COORDENAÇÃO`
    : `[MEDPLENI] RESUMO SEMANAL DE ACOMPANHAMENTO`;

  const contextLine = isExamSpecific
    ? `Avaliação: ${examTitle} · ${institutionName}`
    : `Instituição: ${institutionName} · Período: ${periodLabel}`;

  let text = `${headerTitle}\n${contextLine}\n\n`;

  // 1. Visão Geral
  text += `*PANORAMA GERAL*\n`;
  text += `• Participação: ${participationRate.toFixed(1)}% (${totalStudents} estudantes monitorados)\n`;
  text += `• Média Institucional: ${averageScore.toFixed(1)}% (Régua de Corte: 60%)\n`;
  if (highlightClass) {
    text += `• Destaque Positivo: ${highlightClass.name} (${highlightClass.evolution})\n`;
  }
  text += `\n`;

  // 2. Pontos de Atenção
  text += `*PONTOS DE ATENÇÃO ACADÊMICA*\n`;
  text += `• Estudantes abaixo de 60%: ${studentsBelowCutCount} discentes\n`;
  text += `• Zona de Decisão (51–60%): ${studentsInDecisionZoneCount} discentes com alto potencial de nivelamento\n`;

  if (classesBelowCut.length > 0) {
    text += `• Turmas com média crítica (< 60%): ${classesBelowCut.join(", ")}\n`;
  } else {
    text += `• Nenhuma turma com média abaixo de 60% no momento.\n`;
  }

  if (weakestArea) {
    text += `• Área mais desafiadora: ${weakestArea.name} (rendimento médio de ${weakestArea.score.toFixed(1)}%)\n`;
  }
  text += `\n`;

  // 3. Lista de Estudantes (opcional sob controle de privacidade)
  if (includeStudentNames && criticalStudents.length > 0) {
    text += `*ESTUDANTES PRIORITÁRIOS (NIVELAMENTO IMEDIATO)*\n`;
    criticalStudents.slice(0, 10).forEach((st, idx) => {
      text += `${idx + 1}. ${st.name} (${st.classLabel}) — Média: ${st.score.toFixed(1)}%\n`;
    });
    if (criticalStudents.length > 10) {
      text += `... e mais ${criticalStudents.length - 10} discentes no relatório completo.\n`;
    }
    text += `\n`;
  } else if (!includeStudentNames) {
    text += `_Nomes individuais omitidos por padrão de privacidade. Visualize no painel de Acompanhamento._\n\n`;
  }

  // 4. Rodapé
  text += `*Diretriz:* Recomendada aplicação de listas de nivelamento focadas para as turmas e estudantes na Zona de Decisão.\n`;
  text += `Base: MedPleni B2B • Módulo de Acompanhamento Acadêmico`;

  return text;
}
