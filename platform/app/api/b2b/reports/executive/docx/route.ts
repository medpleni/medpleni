import { NextResponse } from "next/server";
import { getB2BUserContext } from "@/lib/b2b/auth";
import { generateExecutiveReportDOCX, type ReportGenerationParams } from "@/lib/b2b/report-generator";

export async function GET(request: Request) {
  const context = await getB2BUserContext();

  if (!context?.institution?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const examTitle = searchParams.get("examTitle") || "Simulado Nacional ENAMED 2027.1";
  const period = searchParams.get("period") || "Semestre 2027.1";

  const reportData: ReportGenerationParams = {
    institutionName: context.institution.name || "Faculdade Demonstração de Medicina",
    institutionInitials: context.institution.initials || "FADEP",
    courseName: "Medicina",
    academicTerm: period,
    generatedAt: new Date().toLocaleDateString("pt-BR"),
    generatedByName: context.userName || "Diretoria Acadêmica",
    selectedExamTitle: examTitle,
    kpis: {
      institutionMeanScore: 65.4,
      studentsBelowCutCount: 42,
      studentsBelowCutPercentage: 18.4,
      participationRate: 95.0,
      totalEnrolled: 240,
      totalPresent: 228,
      totalAbsent: 12,
      classesBelowCutCount: 2,
      totalClasses: 12,
      decisionZoneCount: 34,
      decisionZonePercentage: 14.9,
      footnote: {
        base: `Prova em análise: ${examTitle}`,
        period: `Período Letivo ${period}`,
        source: "MedPleni B2B • Módulo Executivo",
      },
    },
    heatmap: [
      {
        classGroupId: "cg-1",
        classGroupLabel: "MED 1º Período (2030.1)",
        period: 1,
        totalStudents: 20,
        classAverageScore: 53.8,
        classScoreBand: "51_60",
        areas: [
          { areaName: "Clínica Médica", averageScore: 50.2, scoreBand: "51_60", questionsCount: 12 },
          { areaName: "Cirurgia Geral", averageScore: 48.6, scoreBand: "ate_50", questionsCount: 10 },
          { areaName: "Pediatria", averageScore: 54.1, scoreBand: "51_60", questionsCount: 10 },
          { areaName: "Ginecologia e Obstetrícia", averageScore: 52.3, scoreBand: "51_60", questionsCount: 10 },
          { areaName: "Medicina de Família e Comunidade", averageScore: 58.0, scoreBand: "51_60", questionsCount: 10 },
          { areaName: "Saúde Coletiva", averageScore: 60.2, scoreBand: "61_70", questionsCount: 8 },
        ],
      },
      {
        classGroupId: "cg-4",
        classGroupLabel: "MED 4º Período (2028.2 · ENAMED I)",
        period: 4,
        totalStudents: 20,
        classAverageScore: 62.1,
        classScoreBand: "61_70",
        areas: [
          { areaName: "Clínica Médica", averageScore: 60.5, scoreBand: "61_70", questionsCount: 12 },
          { areaName: "Cirurgia Geral", averageScore: 59.2, scoreBand: "51_60", questionsCount: 10 },
          { areaName: "Pediatria", averageScore: 64.0, scoreBand: "61_70", questionsCount: 10 },
          { areaName: "Ginecologia e Obstetrícia", averageScore: 61.8, scoreBand: "61_70", questionsCount: 10 },
          { areaName: "Medicina de Família e Comunidade", averageScore: 63.5, scoreBand: "61_70", questionsCount: 10 },
          { areaName: "Saúde Coletiva", averageScore: 65.0, scoreBand: "61_70", questionsCount: 8 },
        ],
      },
      {
        classGroupId: "cg-8",
        classGroupLabel: "MED 8º Período (2026.2 · ENAMED II)",
        period: 8,
        totalStudents: 20,
        classAverageScore: 67.4,
        classScoreBand: "61_70",
        areas: [
          { areaName: "Clínica Médica", averageScore: 66.8, scoreBand: "61_70", questionsCount: 12 },
          { areaName: "Cirurgia Geral", averageScore: 64.5, scoreBand: "61_70", questionsCount: 10 },
          { areaName: "Pediatria", averageScore: 69.2, scoreBand: "61_70", questionsCount: 10 },
          { areaName: "Ginecologia e Obstetrícia", averageScore: 68.0, scoreBand: "61_70", questionsCount: 10 },
          { areaName: "Medicina de Família e Comunidade", averageScore: 68.9, scoreBand: "61_70", questionsCount: 10 },
          { areaName: "Saúde Coletiva", averageScore: 70.1, scoreBand: "61_70", questionsCount: 8 },
        ],
      },
      {
        classGroupId: "cg-12",
        classGroupLabel: "MED 12º Período (2024.2 · ENAMED III)",
        period: 12,
        totalStudents: 20,
        classAverageScore: 74.2,
        classScoreBand: "71_mais",
        areas: [
          { areaName: "Clínica Médica", averageScore: 73.5, scoreBand: "71_mais", questionsCount: 12 },
          { areaName: "Cirurgia Geral", averageScore: 72.8, scoreBand: "71_mais", questionsCount: 10 },
          { areaName: "Pediatria", averageScore: 76.4, scoreBand: "71_mais", questionsCount: 10 },
          { areaName: "Ginecologia e Obstetrícia", averageScore: 75.1, scoreBand: "71_mais", questionsCount: 10 },
          { areaName: "Medicina de Família e Comunidade", averageScore: 75.6, scoreBand: "71_mais", questionsCount: 10 },
          { areaName: "Saúde Coletiva", averageScore: 77.2, scoreBand: "71_mais", questionsCount: 8 },
        ],
      },
    ],
    timeline: [
      { examId: "asm-1", title: "Simulado Institucional ENAMED 2026.2", date: "2026-08-10", type: "simulado_enamed_8", totalEvaluated: 220, institutionMeanScore: 61.2, rateBelowCut: 22.5 },
      { examId: "asm-2", title: "Avaliação Somativa Integrada 2026.2", date: "2026-11-15", type: "prova_regular", totalEvaluated: 224, institutionMeanScore: 63.7, rateBelowCut: 19.8 },
      { examId: "asm-3", title: examTitle, date: "2027-03-20", type: "simulado_enamed_8", totalEvaluated: 228, institutionMeanScore: 65.4, rateBelowCut: 18.4 },
    ],
    coverage: [
      { areaName: "Clínica Médica", questionsCount: 36, percentageOfTotal: 20.0, referencePercentage: 20.0, status: "satisfatoria" },
      { areaName: "Cirurgia Geral", questionsCount: 27, percentageOfTotal: 15.0, referencePercentage: 15.0, status: "satisfatoria" },
      { areaName: "Pediatria", questionsCount: 27, percentageOfTotal: 15.0, referencePercentage: 15.0, status: "satisfatoria" },
      { areaName: "Ginecologia e Obstetrícia", questionsCount: 27, percentageOfTotal: 15.0, referencePercentage: 15.0, status: "satisfatoria" },
      { areaName: "Medicina de Família e Comunidade", questionsCount: 27, percentageOfTotal: 15.0, referencePercentage: 15.0, status: "satisfatoria" },
      { areaName: "Saúde Coletiva", questionsCount: 18, percentageOfTotal: 10.0, referencePercentage: 10.0, status: "satisfatoria" },
      { areaName: "Saúde Mental", questionsCount: 18, percentageOfTotal: 10.0, referencePercentage: 10.0, status: "satisfatoria" },
    ],
  };

  const docxBuffer = generateExecutiveReportDOCX(reportData);
  const filename = `Relatorio_Executivo_${reportData.institutionInitials}_${period.replace(/\s+/g, "_")}.docx`;

  return new NextResponse(docxBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-cache",
    },
  });
}
