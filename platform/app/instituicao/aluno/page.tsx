import React from "react";
import { redirect } from "next/navigation";
import { getB2BUserContext } from "@/lib/b2b/auth";
import { createClient } from "@/lib/supabase/server";
import AlunoPortalClient, {
  StudentPortalExam,
  StudentPortalIntervention,
  PracticeQuestion,
} from "./AlunoPortalClient";
import {
  sortAreasByGainOpportunity,
  calculateNextStepRecommendation,
  calculateStudentEvolutionTimeline,
} from "@/lib/b2b/aluno";
import {
  DEFAULT_READINESS_CONFIG,
  evaluateStudentReadiness,
  type ReadinessConfig,
} from "@/lib/b2b/readiness";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AlunoPortalPage({ searchParams }: PageProps) {
  const context = await getB2BUserContext();
  const resolvedSearchParams = await searchParams;

  if (!context?.institution?.id) {
    redirect("/login");
  }

  const institutionId = context.institution.id;
  const cutScore = context.institution.cut_score || 60;
  const supabase = await createClient();

  // Se o usuário logado for dirigente/coordenador/docente, permite visualizar como aluno demo
  const isActualStudent = context.role === "aluno";
  const studentUserId =
    (typeof resolvedSearchParams.studentUserId === "string"
      ? resolvedSearchParams.studentUserId
      : null) ||
    context.userId ||
    "00000000-0000-0000-0000-000000000001";

  // 1. Busca dados da turma e matrícula do aluno
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, class_group_id, class_groups(id, name, period)")
    .eq("student_user_id", studentUserId)
    .maybeSingle();

  // Fallback demo caso não haja matrícula real ainda
  const classGroupName = (enrollment?.class_groups as any)?.name || "Turma MED-2026.2 (P8)";
  const classGroupPeriod = (enrollment?.class_groups as any)?.period || 8;
  const studentName = context.userName || "Ana Beatriz Lourenço";

  // 2. Busca tentativas do aluno em avaliações
  const { data: dbAttempts } = await supabase
    .from("assessment_attempts")
    .select(`
      id,
      score_percentage,
      status,
      created_at,
      assessment_id,
      assessments (
        id,
        title,
        type,
        starts_at,
        answers_released_at,
        class_group_id
      )
    `)
    .eq("student_user_id", studentUserId);

  // 3. Monta lista de avaliações (com fallback demo rico para FADEP/piloto)
  let exams: StudentPortalExam[] = [];

  if (dbAttempts && dbAttempts.length > 0) {
    exams = dbAttempts.map((att: any) => ({
      id: att.assessments?.id || att.id,
      title: att.assessments?.title || "Avaliação Institucional",
      type: att.assessments?.type || "simulado",
      date: att.assessments?.starts_at || att.created_at,
      status: "realizada" as const,
      studentScore: att.score_percentage || 0,
      classAverage: 62.5, // Média de referência
      isReleased: Boolean(att.assessments?.answers_released_at),
      totalQuestions: 50,
      wrongCount: Math.round(50 * (1 - (att.score_percentage || 0) / 100)),
    }));
  }

  // Se não houver avaliações no banco para este usuário demo, alimenta dados padrão da FADEP
  if (exams.length === 0) {
    exams = [
      {
        id: "asm-demo-2026-1",
        title: "Simulado Nacional ENAMED 2026.1 (Etapa 4º e 8º)",
        type: "simulado_enamed_8",
        date: "2026-03-20T08:00:00Z",
        status: "realizada",
        studentScore: 54.0,
        classAverage: 58.0,
        isReleased: true,
        totalQuestions: 50,
        wrongCount: 23,
        wrongItems: [
          {
            id: "err-1",
            statement: "Homem de 62 anos, em pós-operatório de colectomia parcial, evolui no 3º DPO com febre (38,6°C), dor e empastamento em panturrilha esquerda com edema assimétrico (+2/+4). Não recebeu tromboprofilaxia por recusa inicial. Qual a conduta diagnóstica imediata?",
            clinicalContext: "Paciente obeso (IMC 32 kg/m²). Sinal de Homans positivo à dorsiflexão.",
            selectedLetter: "B",
            correctLetter: "A",
            area: "Cirurgia Geral",
            explanation: "Suspeita de TVP pós-operatória de moderada/alta probabilidade pré-teste (escore de Wells ≥ 2) exige Ultrassonografia Doppler venosa com compressão imediata dos membros inferiores. O D-dímero não é indicado no pós-operatório por estar fisiologicamente elevado.",
            options: [
              { letter: "A", text: "Ultrassonografia Doppler venosa com compressão do membro inferior esquerdo", isCorrect: true },
              { letter: "B", text: "Dosagem de D-dímero plasmático para exclusão rápida", isCorrect: false },
              { letter: "C", text: "Iniciar anticoagulação plena com varfarina oral sem necessidade de confirmação por imagem", isCorrect: false },
              { letter: "D", text: "Flebografia contrastada invasiva como primeiro exame", isCorrect: false },
            ],
          },
          {
            id: "err-2",
            statement: "Paciente de 45 anos procura UBS com quadro de tosse persistente há 4 semanas, perda ponderal de 5 kg e sudorese noturna. Baciloscopia de escarro positiva (2+). Iniciado esquema RIPE. Após 15 dias, retorna com náuseas importantes e icterícia escleral. Enzimas hepáticas: TGO 320 U/L (VR <35), TGP 290 U/L. Qual a conduta?",
            clinicalContext: "Bilirrubina total: 3,8 mg/dL com predomínio de direta.",
            selectedLetter: "C",
            correctLetter: "A",
            area: "Saúde Coletiva",
            explanation: "Hepatotoxicidade grave induzida por tuberculostáticos (elevação de transaminases > 3x o limite superior com sintomas ou icterícia) exige a SUSPENSÃO IMEDIATA de todos os medicamentos do esquema RIPE e monitorização semanal até a normalização dos níveis de TGO/TGP.",
            options: [
              { letter: "A", text: "Suspender imediatamente todos os fármacos do esquema RIPE e monitorar até normalização clínica e laboratorial", isCorrect: true },
              { letter: "B", text: "Manter o esquema e associar protetor hepático e antiemético", isCorrect: false },
              { letter: "C", text: "Suspender apenas o etambutol e manter rifampicina e isoniazida", isCorrect: false },
              { letter: "D", text: "Reduzir a dose de isoniazida pela metade e reavaliar em 30 dias", isCorrect: false },
            ],
          },
        ],
      },
      {
        id: "asm-demo-2026-2",
        title: "Avaliação Semestral Integrada 2026.2",
        type: "somativa_periodo",
        date: "2026-08-15T08:00:00Z",
        status: "realizada",
        studentScore: 61.5,
        classAverage: 63.0,
        isReleased: true,
        totalQuestions: 60,
        wrongCount: 23,
      },
      {
        id: "asm-demo-2027-1",
        title: "Simulado Nacional ENAMED 2027.1 — Etapas 4º, 8º e 12º",
        type: "simulado_enamed_8",
        date: "2026-11-10T08:00:00Z",
        status: "realizada",
        studentScore: 67.0,
        classAverage: 64.5,
        isReleased: true,
        totalQuestions: 60,
        wrongCount: 20,
      },
      {
        id: "asm-demo-open-1",
        title: "Avaliação Intermediária de Prontidão Clínica 2026.2",
        type: "formativa",
        date: new Date(Date.now() + 86400000 * 2).toISOString(),
        status: "aberta",
        isReleased: false,
        totalQuestions: 30,
      },
    ];
  }

  // 4. Intervenções pedagógicas atribuídas à turma do aluno
  const { data: dbInterventions } = await supabase
    .from("interventions")
    .select(`
      id,
      title,
      type,
      axis_value,
      due_date,
      practice_list_questions_count,
      intervention_adherences (
        id,
        student_user_id,
        questions_completed,
        questions_target,
        status
      )
    `)
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: false });

  let interventions: StudentPortalIntervention[] = [];

  if (dbInterventions && dbInterventions.length > 0) {
    interventions = dbInterventions.map((inv: any) => {
      const adherence = Array.isArray(inv.intervention_adherences)
        ? inv.intervention_adherences.find((a: any) => a.student_user_id === studentUserId)
        : null;

      return {
        id: inv.id,
        title: inv.title,
        axisValue: inv.axis_value,
        type: inv.type,
        dueDate: inv.due_date,
        questionsTarget: adherence?.questions_target || inv.practice_list_questions_count || 20,
        questionsCompleted: adherence?.questions_completed || 0,
        status: (adherence?.status as any) || "pendente",
      };
    });
  }

  if (interventions.length === 0) {
    interventions = [
      {
        id: "ffff1111-1111-1111-1111-000000000001",
        title: "Lista Dirigida: Cirurgia Geral e Abdome Agudo",
        axisValue: "Cirurgia Geral",
        type: "lista_exercicios",
        dueDate: "2026-11-30",
        questionsTarget: 20,
        questionsCompleted: 8,
        status: "em_progresso",
      },
      {
        id: "ffff2222-2222-2222-2222-000000000002",
        title: "Reforço em Epidemiologia e Indicadores da APS",
        axisValue: "Saúde Coletiva",
        type: "lista_exercicios",
        dueDate: "2026-12-05",
        questionsTarget: 20,
        questionsCompleted: 0,
        status: "pendente",
      },
    ];
  }

  // 5. Áreas médicas calculadas (ordenadas por oportunidade de ganho)
  const rawAreas = [
    { area: "Cirurgia Geral", totalAnswered: 45, correctCount: 19, questionsTrained: 28 }, // 42.2% (Crítico)
    { area: "Saúde Coletiva", totalAnswered: 40, correctCount: 22, questionsTrained: 20 }, // 55.0% (Zona de decisão)
    { area: "Ginecologia e Obstetrícia", totalAnswered: 35, correctCount: 21, questionsTrained: 18 }, // 60.0% (No corte)
    { area: "Clínica Médica", totalAnswered: 60, correctCount: 42, questionsTrained: 55 }, // 70.0% (Seguro)
    { area: "Pediatria", totalAnswered: 40, correctCount: 32, questionsTrained: 30 }, // 80.0% (Seguro)
  ];

  const areas = sortAreasByGainOpportunity(rawAreas, cutScore);

  // 6. Próximo passo com o porquê
  const pendingInterventionsCount = interventions.filter((i) => i.status !== "concluida").length;
  const pendingExamsCount = exams.filter((e) => e.status === "aberta").length;
  const nextStep = calculateNextStepRecommendation({
    areas,
    pendingExamsCount,
    pendingInterventionsCount,
    cutScore,
  });

  // 7. Evolução temporal (sem ranking e sem posição)
  const finishedExams = exams.filter((e) => e.status === "realizada");
  const evolution = calculateStudentEvolutionTimeline(
    finishedExams.map((e) => ({
      examId: e.id,
      examTitle: e.title,
      date: e.date,
      studentScore: e.studentScore || 0,
      classAverage: e.classAverage || 60,
      isReleased: e.isReleased,
      totalQuestions: e.totalQuestions,
      wrongCount: e.wrongCount || 0,
    }))
  );

  // 8. Busca questões para prática
  const { data: dbQuestions } = await supabase
    .from("questions")
    .select(`
      id,
      statement,
      clinical_context,
      area,
      subarea,
      explanation,
      question_options (
        letter,
        text,
        is_correct
      )
    `)
    .limit(15);

  let practiceQuestions: PracticeQuestion[] = [];

  if (dbQuestions && dbQuestions.length > 0) {
    practiceQuestions = dbQuestions.map((q: any) => ({
      id: q.id,
      statement: q.statement,
      clinicalContext: q.clinical_context,
      area: q.area,
      subarea: q.subarea,
      explanation: q.explanation,
      options: (q.question_options || []).map((o: any) => ({
        letter: o.letter,
        text: o.text,
        isCorrect: Boolean(o.is_correct),
      })),
    }));
  }

  if (practiceQuestions.length === 0) {
    practiceQuestions = [
      {
        id: "q-demo-1",
        statement: "Paciente do sexo masculino, 58 anos, hipertenso em uso de losartana, admitido na emergência com dor precordial em aperto irradiando para o braço esquerdo há 2 horas. ECG demonstra supradesnivelamento de ST ≥ 1mm em V1 a V4. O serviço dispõe de serviço de hemodinâmica ativo com tempo porta-balão estimado em 45 minutos. Qual a conduta de reperfusão imediata recomendada?",
        clinicalContext: "PA: 140x90 mmHg, FC: 88 bpm, SatO2: 96% em ar ambiente.",
        area: "Clínica Médica",
        subarea: "Cardiologia",
        explanation: "No infarto com supradesnivelamento de ST (IAMCSST), quando o tempo porta-balão é inferior a 90 minutos (ou 120 minutos em caso de transferência), a angioplastia coronária primária (ICP primária) é a estratégia de reperfusão de primeira escolha segundo as diretrizes da SBC e AHA/ACC.",
        options: [
          { letter: "A", text: "Encaminhar imediatamente para Angioplastia Coronária Primária (ICP primária)", isCorrect: true },
          { letter: "B", text: "Realizar trombólise química com alteplase ou tenecteplase na sala de emergência", isCorrect: false },
          { letter: "C", text: "Aguardar nova dosagem de troponina em 3 horas antes de qualquer conduta invasiva", isCorrect: false },
          { letter: "D", text: "Iniciar apenas terapia medicamentosa com betabloqueador e nitrato sublingual", isCorrect: false },
        ],
      },
      {
        id: "q-demo-2",
        statement: "Homem de 28 anos é admitido na emergência com dor abdominal de início periumbilical há 18 horas que migrou para a fossa ilíaca direita, acompanhada de náuseas, hiporexia e febre baixa (37,9°C). Ao exame: dor à descompressão súbita no ponto de McBurney (Sinal de Blumberg positivo). Leucograma: 14.200/mm³ com 6% de bastões. Qual o diagnóstico e a conduta preconizada?",
        clinicalContext: "Abdome em tábua localizado em FID. RHA presentes.",
        area: "Cirurgia Geral",
        subarea: "Abdome Agudo",
        explanation: "O quadro clínico clássico de dor periumbilical migratória associada a sinal de Blumberg positivo e leucocitose com desvio à esquerda é típico de apendicite aguda (Escore de Alvarado ≥ 7). Em homens jovens com apresentação típica, a indicação é apendicectomia cirúrgica de urgência.",
        options: [
          { letter: "A", text: "Apendicite aguda; indicar apendicectomia cirúrgica de urgência", isCorrect: true },
          { letter: "B", text: "Diverticulite aguda cecal; prescrever ciprofloxacino e metronidazol ambulatorial", isCorrect: false },
          { letter: "C", text: "Gastroenterite aguda bacteriana; prescrever sintomáticos e reidratação oral", isCorrect: false },
          { letter: "D", text: "Urolitíase obstrutiva; prescrever analgésicos e solicitar tomografia sem contraste", isCorrect: false },
        ],
      },
      {
        id: "q-demo-3",
        statement: "Gestante de 32 anos, primigesta, com 34 semanas de idade gestacional, procura pronto-socorro obstétrico com cefaleia occipital persistente e turvação visual. PA: 165x110 mmHg confirmada após 15 minutos de repouso. Fita urinária com proteinúria (3+). Qual a conduta profilática prioritária para prevenção de convulsões?",
        clinicalContext: "BCF: 142 bpm. Tônus uterino normal. Ausência de sangramento vaginal.",
        area: "Ginecologia e Obstetrícia",
        subarea: "Obstetrícia",
        explanation: "O diagnóstico é de Pré-Eclâmpsia com sinais de gravidade (PA sistólica ≥ 160 ou diastólica ≥ 110 associada a sintomas neurológicos/visuais). A conduta mandatória para prevenção de eclâmpsia é a administração imediata de Sulfato de Magnésio (esquema de Pritchard ou Zuspan), além do controle anti-hipertensivo rápido (hidralazina venosa).",
        options: [
          { letter: "A", text: "Sulfato de magnésio intravenoso imediato e controle pressórico com hidralazina", isCorrect: true },
          { letter: "B", text: "Diazepam intravenoso para sedação e repouso absoluto no leito", isCorrect: false },
          { letter: "C", text: "Iniciar furosemida venosa para redução rápida da volemia", isCorrect: false },
          { letter: "D", text: "Aguardar exames laboratoriais antes de instituir qualquer conduta farmacológica", isCorrect: false },
        ],
      },
    ];
  }

  const initialTab = typeof resolvedSearchParams.tab === "string" ? resolvedSearchParams.tab : "inicio";

  // 9. Prontidão Acadêmica (se liberada para os alunos pela coordenação)
  const readinessRaw = (context.institution.settings as any)?.readiness;
  const readinessConfig: ReadinessConfig = {
    volumeRuleEnabled: readinessRaw?.volumeRuleEnabled ?? DEFAULT_READINESS_CONFIG.volumeRuleEnabled,
    minQuestionsYear: readinessRaw?.minQuestionsYear ?? DEFAULT_READINESS_CONFIG.minQuestionsYear,
    consistencyRuleEnabled: readinessRaw?.consistencyRuleEnabled ?? DEFAULT_READINESS_CONFIG.consistencyRuleEnabled,
    minScorePercent: readinessRaw?.minScorePercent ?? DEFAULT_READINESS_CONFIG.minScorePercent,
    minExamsCount: readinessRaw?.minExamsCount ?? DEFAULT_READINESS_CONFIG.minExamsCount,
    levelLabels: readinessRaw?.levelLabels || DEFAULT_READINESS_CONFIG.levelLabels,
    showToStudents: readinessRaw?.showToStudents ?? DEFAULT_READINESS_CONFIG.showToStudents,
  };

  const studentReadiness = readinessConfig.showToStudents
    ? evaluateStudentReadiness(
        {
          studentUserId,
          studentName,
          registration: "2026101",
          classGroupId: enrollment?.class_group_id || "cg-8",
          classGroupLabel: classGroupName,
          questionsAnsweredCount: 7800,
          examHistory: finishedExams.map((e) => ({
            examId: e.id,
            examTitle: e.title,
            date: e.date,
            scorePercentage: e.studentScore || 0,
          })),
        },
        readinessConfig
      )
    : undefined;

  return (
    <AlunoPortalClient
      studentName={studentName}
      classGroupName={classGroupName}
      period={classGroupPeriod}
      institutionName={context.institution.name}
      initialTab={initialTab}
      nextStep={nextStep}
      areas={areas}
      evolution={evolution}
      exams={exams}
      interventions={interventions}
      practiceQuestions={practiceQuestions}
      isDemoStudent={!isActualStudent}
      readiness={studentReadiness}
    />
  );
}
