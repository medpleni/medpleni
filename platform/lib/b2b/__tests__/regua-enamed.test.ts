import { describe, it, expect } from "vitest";
import {
  computeReguaEnamedOverview,
  getPeriodsForStage,
  RawAssessmentInput,
  RawAttemptInput,
  RawClassGroupInput,
  RawInterventionInput,
  RawStudentScoreInput,
} from "../regua-enamed";
import { REGUA_ENAMED_CONTENT } from "../regua-enamed-content";

describe("Régua ENAMED — Posicionamento em 3 Etapas (P23 / RE-01 e RE-02)", () => {
  const mockClasses: RawClassGroupInput[] = [
    { id: "cg-p3", name: "Turma 2024.2 - P3", period: 3, studentsCount: 40 },
    { id: "cg-p4", name: "Turma 2024.1 - P4", period: 4, studentsCount: 42 },
    { id: "cg-p7", name: "Turma 2022.2 - P7", period: 7, studentsCount: 38 },
    { id: "cg-p8", name: "Turma 2022.1 - P8", period: 8, studentsCount: 45 },
    { id: "cg-p11", name: "Turma 2020.2 - P11", period: 11, studentsCount: 35 },
    { id: "cg-p12", name: "Turma 2020.1 - P12", period: 12, studentsCount: 36 },
  ];

  const mockAssessments: RawAssessmentInput[] = [
    {
      id: "exam-s1",
      title: "Simulado ENAMED 1ª Etapa (P4)",
      type: "simulado_enamed_4",
      examDate: "2026-05-10",
      modality: "presencial_papel",
      classGroupId: "cg-p4",
    },
    {
      id: "exam-s2",
      title: "Simulado Geral Ciclo Clínico (P8)",
      type: "simulado_enamed_8",
      examDate: "2026-06-15",
      modality: "online",
      classGroupId: "cg-p8",
    },
    {
      id: "exam-s3",
      title: "Simulado Terminal ENAMED 12º Período",
      type: "simulado_enamed_12",
      examDate: "2026-09-20",
      modality: "hibrida",
      classGroupId: "cg-p12",
    },
  ];

  const mockAttempts: RawAttemptInput[] = [
    { assessmentId: "exam-s1", studentUserId: "u1", scorePercentage: 68.0, status: "finalizada" },
    { assessmentId: "exam-s1", studentUserId: "u2", scorePercentage: 54.0, status: "finalizada" },
    { assessmentId: "exam-s1", studentUserId: "u3", scorePercentage: 48.0, status: "finalizada" },
    { assessmentId: "exam-s2", studentUserId: "u4", scorePercentage: 72.5, status: "finalizada" },
    { assessmentId: "exam-s3", studentUserId: "u5", scorePercentage: 61.0, status: "finalizada" },
  ];

  const mockStudentScores: RawStudentScoreInput[] = [
    // P4 (Etapa 1)
    { studentUserId: "u1", classGroupId: "cg-p4", averageScorePercentage: 68.0 },
    { studentUserId: "u2", classGroupId: "cg-p4", averageScorePercentage: 54.0 }, // Zona de decisão (51-60)
    { studentUserId: "u3", classGroupId: "cg-p4", averageScorePercentage: 48.0 }, // Abaixo de 60
    // P8 (Etapa 2)
    { studentUserId: "u4", classGroupId: "cg-p8", averageScorePercentage: 72.5 },
    { studentUserId: "u6", classGroupId: "cg-p8", averageScorePercentage: 58.0 }, // Zona de decisão
    // P12 (Etapa 3)
    { studentUserId: "u5", classGroupId: "cg-p12", averageScorePercentage: 61.0 },
  ];

  const mockInterventions: RawInterventionInput[] = [
    {
      id: "inv-1",
      title: "Reforço Farmacologia e Patologia",
      actionType: "exercise_list",
      classGroupId: "cg-p4",
      targetCount: 42,
      completedCount: 38,
      status: "em_andamento",
    },
    {
      id: "inv-2",
      title: "Pré e Pós-aula Abdome Agudo",
      actionType: "pre_post_lecture",
      classGroupId: "cg-p8",
      targetCount: 45,
      completedCount: 40,
      status: "em_andamento",
    },
  ];

  it("1. Distribui corretamente os períodos e marcos nas 3 etapas", () => {
    expect(getPeriodsForStage(1)).toEqual([1, 2, 3, 4]);
    expect(getPeriodsForStage(2)).toEqual([5, 6, 7, 8]);
    expect(getPeriodsForStage(3)).toEqual([9, 10, 11, 12]);
  });

  it("2. Calcula a visão consolidada das 3 etapas com turmas, simulados e intervenções", () => {
    const overview = computeReguaEnamedOverview({
      institutionId: "inst-fadep",
      institutionName: "Faculdade Demonstração",
      cutScore: 60,
      classes: mockClasses,
      assessments: mockAssessments,
      attempts: mockAttempts,
      studentScores: mockStudentScores,
      interventions: mockInterventions,
      academicPeriodLabel: "2026.1",
    });

    expect(overview.cutScore).toBe(60);

    // Etapa 1 (4º período)
    const stage1 = overview.stages[1];
    expect(stage1.periodTarget).toBe(4);
    expect(stage1.classes.length).toBe(2); // P3 e P4
    expect(stage1.assessments.length).toBe(1);
    expect(stage1.assessments[0].title).toContain("1ª Etapa");
    expect(stage1.interventions.length).toBe(1);
    expect(stage1.totalStudentsBelowCutScore).toBe(2); // u2 (54) e u3 (48)
    expect(stage1.totalStudentsInDecisionZone).toBe(1); // u2 (54)

    // Etapa 2 (8º período)
    const stage2 = overview.stages[2];
    expect(stage2.periodTarget).toBe(8);
    expect(stage2.classes.length).toBe(2); // P7 e P8
    expect(stage2.assessments.length).toBe(1);
    expect(stage2.interventions.length).toBe(1);

    // Etapa 3 (12º período)
    const stage3 = overview.stages[3];
    expect(stage3.periodTarget).toBe(12);
    expect(stage3.classes.length).toBe(2); // P11 e P12
    expect(stage3.assessments.length).toBe(1);
  });

  it("3. Exibe aviso explícito para a 1ª etapa informando incorporação da matriz do ciclo básico pelo INEP", () => {
    const overview = computeReguaEnamedOverview({
      institutionId: "inst-fadep",
      institutionName: "Faculdade Demonstração",
      classes: mockClasses,
      assessments: mockAssessments,
      attempts: mockAttempts,
      studentScores: mockStudentScores,
      interventions: mockInterventions,
    });

    expect(overview.stages[1].hasSpecialNotice).toBe(true);
    expect(overview.stages[1].specialNoticeText).toContain("matriz oficial do ciclo básico (1ª etapa - 4º período)");
    expect(overview.stages[1].specialNoticeText).toContain("quando o INEP publicar");

    // Etapas 2 e 3 não têm aviso pendente de matriz básica
    expect(overview.stages[2].hasSpecialNotice).toBe(false);
    expect(overview.stages[3].hasSpecialNotice).toBe(false);
  });

  it("4. Garante que campos regulatórios pendentes contêm 'a preencher pelo Mario com fonte oficial'", () => {
    const reg = REGUA_ENAMED_CONTENT;
    expect(reg.generalFramework.governingLaw).toContain("a preencher pelo Mario com fonte oficial");
    expect(reg.generalFramework.decreeOrdinance).toContain("a preencher pelo Mario com fonte oficial");
    expect(reg.stages[1].officialFramework.lawNumber).toContain("a preencher pelo Mario com fonte oficial");
    expect(reg.stages[1].officialFramework.stageWeight).toContain("a preencher pelo Mario com fonte oficial");
    expect(reg.stages[2].officialFramework.inepNotice).toContain("a preencher pelo Mario com fonte oficial");
    expect(reg.stages[3].officialFramework.ordinanceNumber).toContain("a preencher pelo Mario com fonte oficial");
  });

  it("5. Auditoria de termos: sem 'programática', sem 'Tutor', sem 'nota ENAMED' e sem 'não fazemos predição' (RE-03 reprovada)", () => {
    const overview = computeReguaEnamedOverview({
      institutionId: "inst-fadep",
      institutionName: "Faculdade Demonstração",
      classes: mockClasses,
      assessments: mockAssessments,
      attempts: mockAttempts,
      studentScores: mockStudentScores,
      interventions: mockInterventions,
    });

    const fullContent = JSON.stringify(overview) + JSON.stringify(REGUA_ENAMED_CONTENT);

    // Sem 'programática'
    expect(fullContent.toLowerCase()).not.toContain("programática");
    expect(fullContent.toLowerCase()).not.toContain("programatica");

    // Sem papel Tutor
    expect(fullContent).not.toContain("Tutor");
    expect(fullContent).not.toContain("tutor");

    // Sem rotular como "nota ENAMED"
    expect(fullContent).not.toContain("nota ENAMED");
    expect(fullContent).not.toContain("nota do ENAMED");

    // RE-03 reprovada: NÃO exibe o aviso 'não fazemos predição'
    expect(fullContent.toLowerCase()).not.toContain("não fazemos predição");
    expect(fullContent.toLowerCase()).not.toContain("nao fazemos predicao");
    expect(fullContent.toLowerCase()).not.toContain("sem predição");
  });

  it("6. Garante rodapé padronizado 'Base / Período / Fonte' em todas as etapas", () => {
    const overview = computeReguaEnamedOverview({
      institutionId: "inst-fadep",
      institutionName: "Faculdade Demonstração",
      classes: mockClasses,
      assessments: mockAssessments,
      attempts: mockAttempts,
      studentScores: mockStudentScores,
      interventions: mockInterventions,
      academicPeriodLabel: "2026.1",
    });

    [1, 2, 3].forEach((stageNum) => {
      const stage = overview.stages[stageNum as 1 | 2 | 3];
      expect(stage.footerMetadata.baseText).toContain("Base:");
      expect(stage.footerMetadata.periodText).toContain("Período: 2026.1");
      expect(stage.footerMetadata.sourceText).toContain("Fonte:");
    });
  });

  it("7. Recalcula zonas de corte quando cutScore muda na configuração institucional", () => {
    // Com corte em 60
    const view60 = computeReguaEnamedOverview({
      institutionId: "inst-fadep",
      institutionName: "Faculdade Demonstração",
      cutScore: 60,
      classes: mockClasses,
      assessments: mockAssessments,
      attempts: mockAttempts,
      studentScores: mockStudentScores,
    });
    expect(view60.stages[1].totalStudentsBelowCutScore).toBe(2); // u2 (54) e u3 (48)

    // Com corte elevado para 70
    const view70 = computeReguaEnamedOverview({
      institutionId: "inst-fadep",
      institutionName: "Faculdade Demonstração",
      cutScore: 70,
      classes: mockClasses,
      assessments: mockAssessments,
      attempts: mockAttempts,
      studentScores: mockStudentScores,
    });
    // Agora u1 (68), u2 (54) e u3 (48) ficam abaixo de 70
    expect(view70.stages[1].totalStudentsBelowCutScore).toBe(3);
  });
});
