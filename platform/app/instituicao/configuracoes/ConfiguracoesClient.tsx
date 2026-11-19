"use client";

import React, { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  DataTable,
  EmptyState,
  IndicatorFootnote,
} from "@/components/b2b";
import type {
  B2BUserContext,
  Institution,
  Course,
  AcademicTerm,
  ClassGroup,
  B2BRole,
} from "@/lib/b2b/types";
import {
  saveCourse,
  archiveCourse,
  saveAcademicTerm,
  archiveAcademicTerm,
  saveClassGroup,
  archiveClassGroup,
  updateInstitutionParams,
  inviteB2BMember,
  updateMemberRole,
  toggleMemberActive,
  updateMemberScopes,
} from "@/lib/b2b/config-actions";
import {
  parseAndValidateEnrollmentCSV,
  generateErrorReportCSV,
  type ValidEnrollmentRow,
  type EnrollmentRowError,
} from "@/lib/b2b/csv-enrollment";

interface MemberWithProfile {
  id: string;
  user_id: string;
  role: B2BRole;
  is_active: boolean;
  name: string;
  email: string;
  scopedCourseIds: string[];
  scopedClassGroupIds: string[];
}

interface ClassGroupWithDetails extends ClassGroup {
  courseName?: string;
  termLabel?: string;
}

interface Props {
  context: B2BUserContext;
  courses: Course[];
  terms: AcademicTerm[];
  classGroups: ClassGroupWithDetails[];
  members: MemberWithProfile[];
  enrollmentCount: number;
}

type TabKey = "estrutura" | "matriculas" | "usuarios" | "parametros" | "checklist";

export default function ConfiguracoesClient({
  context,
  courses: initialCourses,
  terms: initialTerms,
  classGroups: initialClassGroups,
  members: initialMembers,
  enrollmentCount: initialEnrollmentCount,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("estrutura");
  const [isPending, startTransition] = useTransition();

  // Permissões
  const canManageRoles = context.isMedPleniAdmin || context.role === "dirigente";
  const canManageStructure = context.isMedPleniAdmin || context.role === "dirigente" || context.role === "coordenador";

  // Estados de Estrutura
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseName, setCourseName] = useState("");

  const [termModalOpen, setTermModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<AcademicTerm | null>(null);
  const [termLabel, setTermLabel] = useState("");
  const [termStartDate, setTermStartDate] = useState("");
  const [termEndDate, setTermEndDate] = useState("");

  const [classModalOpen, setClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassGroupWithDetails | null>(null);
  const [classCourseId, setClassCourseId] = useState("");
  const [classTermId, setClassTermId] = useState("");
  const [classPeriod, setClassPeriod] = useState(1);
  const [classLabel, setClassLabel] = useState("");

  // Estados de Matrículas (CSV)
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [validRows, setValidRows] = useState<ValidEnrollmentRow[]>([]);
  const [invalidRows, setInvalidRows] = useState<EnrollmentRowError[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  // Estados de Usuários e Convites
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<B2BRole>("docente");
  const [inviteScopes, setInviteScopes] = useState<string[]>([]);
  const [inviteStatusMsg, setInviteStatusMsg] = useState<string | null>(null);

  // Estados de Parâmetros
  const settings = context.institution.settings || { alerts: {}, readiness: {} };
  const [cutScore, setCutScore] = useState(context.institution.cut_score || 60);
  const [logoUrl, setLogoUrl] = useState(context.institution.logo_url || "");
  const [alerts, setAlerts] = useState({
    below_cut: settings.alerts?.below_cut ?? false,
    no_login: settings.alerts?.no_login ?? false,
    no_questions: settings.alerts?.no_questions ?? false,
    pace_drop: settings.alerts?.pace_drop ?? false,
  });
  const [weeklyTargetEnabled, setWeeklyTargetEnabled] = useState(
    Boolean((settings as any).weekly_target?.enabled)
  );
  const [weeklyTargetQuestions, setWeeklyTargetQuestions] = useState(
    (settings as any).weekly_target?.questions || 50
  );

  // Parâmetros de Sessões Atípicas (Voto SPR nº 9 / Seção 4.10)
  const initialAtypical = (settings as any).atypical_config || {};
  const [atypicalMinQuestions, setAtypicalMinQuestions] = useState(
    initialAtypical.minQuestionsThreshold ?? 20
  );
  const [atypicalChuteMaxSeconds, setAtypicalChuteMaxSeconds] = useState(
    initialAtypical.chute?.maxAverageSeconds ?? 15
  );
  const [atypicalChuteMaxAccuracy, setAtypicalChuteMaxAccuracy] = useState(
    initialAtypical.chute?.maxAccuracyPercentage ?? 30
  );
  const [atypicalRefazendoMinRatio, setAtypicalRefazendoMinRatio] = useState(
    initialAtypical.refazendo?.minRepeatedRatio ?? 0.7
  );
  const [atypicalRefazendoMinAccuracy, setAtypicalRefazendoMinAccuracy] = useState(
    initialAtypical.refazendo?.minAccuracyPercentage ?? 85
  );
  const [atypicalConsultaMinAccuracy, setAtypicalConsultaMinAccuracy] = useState(
    initialAtypical.consultaExterna?.minAccuracyPercentage ?? 90
  );
  const [atypicalConsultaMaxSeconds, setAtypicalConsultaMaxSeconds] = useState(
    initialAtypical.consultaExterna?.maxAverageSeconds ?? 25
  );
  const [atypicalConsultaMaxStdDev, setAtypicalConsultaMaxStdDev] = useState(
    initialAtypical.consultaExterna?.maxStdDevSeconds ?? 8.0
  );
  const [paramFeedback, setParamFeedback] = useState<string | null>(null);

  // ───────────────────────────────────────────────────────────────────────────
  // CHECKLIST DE IMPLANTAÇÃO DINÂMICO
  // ───────────────────────────────────────────────────────────────────────────
  const checklist = useMemo(() => {
    const hasCourse = initialCourses.some((c) => c.is_active);
    const hasTerm = initialTerms.some((t) => t.is_active);
    const hasClass = initialClassGroups.some((cg) => cg.is_active);
    const hasDirigente = initialMembers.some((m) => m.role === "dirigente" && m.is_active);
    const hasCoordenador = initialMembers.some((m) => m.role === "coordenador" && m.is_active);
    const hasDocente = initialMembers.some((m) => m.role === "docente" && m.is_active);
    const hasEnrollments = initialEnrollmentCount > 0;
    const hasParameters = cutScore > 0;

    const items = [
      { id: "course", label: "Cadastrar pelo menos 1 Curso ativo", ok: hasCourse, tab: "estrutura" as TabKey },
      { id: "term", label: "Definir Termo Letivo ativo (ex: 2027.1)", ok: hasTerm, tab: "estrutura" as TabKey },
      { id: "class", label: "Criar Turmas dos períodos acadêmicos", ok: hasClass, tab: "estrutura" as TabKey },
      { id: "dirigente", label: "Designar Dirigente institucional", ok: hasDirigente, tab: "usuarios" as TabKey },
      { id: "coordenador", label: "Designar Coordenador de curso", ok: hasCoordenador, tab: "usuarios" as TabKey },
      { id: "docente", label: "Vincular corpo docente e suas turmas", ok: hasDocente, tab: "usuarios" as TabKey },
      { id: "matriculas", label: "Importar matrículas dos alunos (CSV)", ok: hasEnrollments, tab: "matriculas" as TabKey },
      { id: "parametros", label: "Configurar régua de corte e logo oficial", ok: hasParameters, tab: "parametros" as TabKey },
    ];

    const completedCount = items.filter((i) => i.ok).length;
    const progressPercent = Math.round((completedCount / items.length) * 100);

    return { items, completedCount, total: items.length, progressPercent };
  }, [initialCourses, initialTerms, initialClassGroups, initialMembers, initialEnrollmentCount, cutScore]);

  // ───────────────────────────────────────────────────────────────────────────
  // AÇÕES DE CSV DE MATRÍCULAS
  // ───────────────────────────────────────────────────────────────────────────
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setImportFeedback(null);

    const text = await file.text();
    const classRefs = initialClassGroups
      .filter((cg) => cg.is_active)
      .map((cg) => ({ id: cg.id, label: cg.label, period: cg.period }));

    const result = parseAndValidateEnrollmentCSV(text, classRefs);
    setValidRows(result.validRows);
    setInvalidRows(result.invalidRows);
  };

  const downloadErrorReport = () => {
    if (invalidRows.length === 0) return;
    const csvContent = generateErrorReportCSV(invalidRows);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-erros-matriculas-${context.institution.slug}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadTemplateCSV = () => {
    const sampleClasses = initialClassGroups.slice(0, 3).map((c) => c.label).join(" ou ") || "MED-2027-8P";
    const content = `\uFEFFNome,Email,RA,Turma\nCarlos Henrique Lima,carlos.lima@faculdade.edu.br,RA202701,${initialClassGroups[0]?.label || "MED-2027-1P"}\nMariana Santos Costa,mariana.costa@faculdade.edu.br,RA202702,${initialClassGroups[1]?.label || "MED-2027-2P"}\n`;
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "modelo-importacao-matriculas.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmImport = async () => {
    if (validRows.length === 0) return;
    setIsImporting(true);
    setImportFeedback(null);

    try {
      const res = await fetch("/api/b2b/enrollments/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: context.institution.id,
          rows: validRows,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao gravar matrículas.");
      }

      setImportFeedback(
        `Sucesso: ${data.imported_count || 0} alunos matriculados e ${data.updated_count || 0} atualizados sem duplicação.`
      );
      setValidRows([]);
      setInvalidRows([]);
      setCsvFile(null);
      router.refresh();
    } catch (err: any) {
      setImportFeedback(`Erro: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // AÇÕES DE CONVITE E USUÁRIOS
  // ───────────────────────────────────────────────────────────────────────────
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteStatusMsg(null);

    startTransition(async () => {
      try {
        const res = await inviteB2BMember(context.institution.id, {
          fullName: inviteName,
          email: inviteEmail,
          role: inviteRole,
          scopes: inviteScopes,
        });

        if (res.isDemo) {
          setInviteStatusMsg("Convite cadastrado com sucesso. (Modo Demo: envio de e-mail real omitido).");
        } else {
          setInviteStatusMsg("Convite enviado por e-mail com sucesso.");
        }

        setInviteName("");
        setInviteEmail("");
        setInviteScopes([]);
        setTimeout(() => {
          setInviteModalOpen(false);
          setInviteStatusMsg(null);
          router.refresh();
        }, 1200);
      } catch (err: any) {
        setInviteStatusMsg(`Erro: ${err.message}`);
      }
    });
  };

  // ───────────────────────────────────────────────────────────────────────────
  // AÇÕES DE PARÂMETROS
  // ───────────────────────────────────────────────────────────────────────────
  const handleSaveParams = async (e: React.FormEvent) => {
    e.preventDefault();
    setParamFeedback(null);

    startTransition(async () => {
      try {
        await updateInstitutionParams(context.institution.id, {
          cut_score: Number(cutScore),
          logo_url: logoUrl,
          alerts,
          weekly_target_enabled: weeklyTargetEnabled,
          weekly_target_questions: Number(weeklyTargetQuestions),
          atypical_config: {
            minQuestionsThreshold: Number(atypicalMinQuestions),
            chute: {
              maxAverageSeconds: Number(atypicalChuteMaxSeconds),
              maxAccuracyPercentage: Number(atypicalChuteMaxAccuracy),
            },
            refazendo: {
              minRepeatedRatio: Number(atypicalRefazendoMinRatio),
              minAccuracyPercentage: Number(atypicalRefazendoMinAccuracy),
            },
            consultaExterna: {
              minAccuracyPercentage: Number(atypicalConsultaMinAccuracy),
              maxAverageSeconds: Number(atypicalConsultaMaxSeconds),
              maxStdDevSeconds: Number(atypicalConsultaMaxStdDev),
            },
          },
        });
        setParamFeedback("Parâmetros da instituição salvos com sucesso.");
        setTimeout(() => setParamFeedback(null), 3000);
      } catch (err: any) {
        setParamFeedback(`Erro: ${err.message}`);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Bloco 1: Cabeçalho da Página */}
      <PageHeader
        title="Configurações e Implantação"
        subtitle={`Gestão cadastral, estrutura acadêmica e parâmetros operacionais de ${context.institution.name}`}
      />

      {/* Bloco 2: Navegação por Abas (Máximo 5 seções) */}
      <div className="border-b border-border flex items-center gap-2 overflow-x-auto pb-1 text-sm font-medium">
        {[
          { key: "estrutura", label: "Estrutura Acadêmica" },
          { key: "matriculas", label: "Importação de Matrículas (CSV)" },
          { key: "usuarios", label: "Usuários e Papéis" },
          { key: "parametros", label: "Parâmetros Institucionais" },
          { key: "checklist", label: `Checklist de Implantação (${checklist.completedCount}/${checklist.total})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as TabKey)}
            className={`px-4 py-2 rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-card border-t border-x border-border text-primary font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ABA 1: ESTRUTURA (CURSOS, TERMOS, TURMAS) */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "estrutura" && (
        <div className="space-y-6">
          {/* Sub-bloco A: Cursos e Termos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cursos */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground text-base">Cursos</h3>
                    <p className="text-xs text-muted-foreground">Graduações ativas vinculadas à instituição</p>
                  </div>
                  {canManageStructure && (
                    <button
                      onClick={() => {
                        setEditingCourse(null);
                        setCourseName("");
                        setCourseModalOpen(true);
                      }}
                      className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
                    >
                      + Novo Curso
                    </button>
                  )}
                </div>

                {initialCourses.length === 0 ? (
                  <EmptyState title="Nenhum curso cadastrado" description="Cadastre ao menos o curso de Medicina." />
                ) : (
                  <div className="divide-y divide-border">
                    {initialCourses.map((c) => (
                      <div key={c.id} className="py-2.5 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${c.is_active ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                          <span className={`font-medium ${!c.is_active && "line-through text-muted-foreground"}`}>
                            {c.name}
                          </span>
                        </div>
                        {canManageStructure && c.is_active && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingCourse(c);
                                setCourseName(c.name);
                                setCourseModalOpen(true);
                              }}
                              className="text-xs text-muted-foreground hover:text-foreground"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Deseja arquivar o curso ${c.name}?`)) {
                                  archiveCourse(context.institution.id, c.id);
                                }
                              }}
                              className="text-xs text-rose-600 hover:text-rose-700"
                            >
                              Arquivar
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <IndicatorFootnote base="Instituição ativa" periodo="Vigência atual" fonte="Tabela public.courses" />
            </div>

            {/* Termos Letivos */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground text-base">Termos Letivos</h3>
                    <p className="text-xs text-muted-foreground">Ciclos acadêmicos (ex: 2027.1, 2027.2)</p>
                  </div>
                  {canManageStructure && (
                    <button
                      onClick={() => {
                        setEditingTerm(null);
                        setTermLabel("");
                        setTermStartDate("");
                        setTermEndDate("");
                        setTermModalOpen(true);
                      }}
                      className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
                    >
                      + Novo Termo
                    </button>
                  )}
                </div>

                {initialTerms.length === 0 ? (
                  <EmptyState title="Nenhum termo ativo" description="Crie o período letivo para vincular às turmas." />
                ) : (
                  <div className="divide-y divide-border">
                    {initialTerms.map((t) => (
                      <div key={t.id} className="py-2.5 flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium">{t.label}</span>
                          {(t.start_date || t.end_date) && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({t.start_date || "?"} a {t.end_date || "?"})
                            </span>
                          )}
                        </div>
                        {canManageStructure && t.is_active && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingTerm(t);
                                setTermLabel(t.label);
                                setTermStartDate(t.start_date || "");
                                setTermEndDate(t.end_date || "");
                                setTermModalOpen(true);
                              }}
                              className="text-xs text-muted-foreground hover:text-foreground"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Deseja arquivar o termo ${t.label}?`)) {
                                  archiveAcademicTerm(context.institution.id, t.id);
                                }
                              }}
                              className="text-xs text-rose-600 hover:text-rose-700"
                            >
                              Arquivar
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <IndicatorFootnote base="Instituição ativa" periodo="Calendário vigente" fonte="Tabela public.academic_terms" />
            </div>
          </div>

          {/* Sub-bloco B: Turmas (class_groups) */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground text-base">Turmas dos Períodos Acadêmicos</h3>
                <p className="text-xs text-muted-foreground">Turmas do 1º ao 12º período do curso de Medicina</p>
              </div>
              {canManageStructure && (
                <button
                  onClick={() => {
                    setEditingClass(null);
                    setClassCourseId(initialCourses[0]?.id || "");
                    setClassTermId(initialTerms[0]?.id || "");
                    setClassPeriod(1);
                    setClassLabel("");
                    setClassModalOpen(true);
                  }}
                  className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
                >
                  + Nova Turma
                </button>
              )}
            </div>

            <DataTable
              data={initialClassGroups}
              keyExtractor={(cg) => cg.id}
              columns={[
                {
                  key: "period",
                  header: "Período",
                  render: (cg) => (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-muted text-foreground">
                      {cg.period}º Período
                    </span>
                  ),
                },
                {
                  key: "label",
                  header: "Rótulo da Turma",
                  render: (cg) => <span className="font-medium text-foreground">{cg.label}</span>,
                },
                {
                  key: "courseName",
                  header: "Curso",
                  render: (cg) => <span className="text-muted-foreground">{cg.courseName || "Medicina"}</span>,
                },
                {
                  key: "termLabel",
                  header: "Termo Letivo",
                  render: (cg) => <span className="text-muted-foreground">{cg.termLabel || "-"}</span>,
                },
                {
                  key: "status",
                  header: "Status",
                  render: (cg) => (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        cg.is_active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {cg.is_active ? "Ativa" : "Arquivada"}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  header: "Ações",
                  render: (cg) =>
                    canManageStructure && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setEditingClass(cg);
                            setClassCourseId(cg.course_id);
                            setClassTermId(cg.term_id || "");
                            setClassPeriod(cg.period);
                            setClassLabel(cg.label);
                            setClassModalOpen(true);
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          Editar
                        </button>
                        {cg.is_active && (
                          <button
                            onClick={() => {
                              if (confirm(`Deseja arquivar a turma ${cg.label}?`)) {
                                archiveClassGroup(context.institution.id, cg.id);
                              }
                            }}
                            className="text-xs text-rose-600 hover:underline"
                          >
                            Arquivar
                          </button>
                        )}
                      </div>
                    ),
                },
              ]}
            />
            <IndicatorFootnote base="Turmas da instituição" periodo="Semestre vigente" fonte="Tabela public.class_groups" />
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ABA 2: MATRÍCULAS (IMPORTAÇÃO CSV) */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "matriculas" && (
        <div className="space-y-6">
          {/* Bloco 1: Upload e Orientações */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-semibold text-foreground text-base">Importação em Lote de Matrículas</h3>
                <p className="text-xs text-muted-foreground">
                  Arquivo CSV com cabeçalhos: <code className="text-primary font-mono">Nome, Email, RA, Turma</code>.
                  Suporta mais de 200 alunos em poucos segundos com validação linha a linha.
                </p>
              </div>
              <button
                onClick={downloadTemplateCSV}
                className="text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-muted font-medium text-foreground self-start md:self-auto"
              >
                Baixar Modelo CSV
              </button>
            </div>

            {/* Input de Arquivo */}
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleCSVUpload}
                id="csv-file-input"
                className="hidden"
              />
              <label htmlFor="csv-file-input" className="cursor-pointer block space-y-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center font-bold">
                  CSV
                </div>
                <div className="text-sm font-medium text-foreground">
                  {csvFile ? csvFile.name : "Clique para selecionar o arquivo CSV de alunos"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Delimitadores aceitos: vírgula (,) ou ponto-e-vírgula (;). Reimportações não duplicam matrículas.
                </p>
              </label>
            </div>

            {importFeedback && (
              <div
                className={`mt-4 p-3 rounded-lg text-xs font-medium ${
                  importFeedback.startsWith("Sucesso")
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                }`}
              >
                {importFeedback}
              </div>
            )}
          </div>

          {/* Bloco 2: Resumo e Pré-visualização */}
          {(validRows.length > 0 || invalidRows.length > 0) && (
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4 text-xs">
                  <span className="font-semibold text-foreground">
                    Total: {validRows.length + invalidRows.length} linhas
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ {validRows.length} válidas para gravação
                  </span>
                  {invalidRows.length > 0 && (
                    <span className="text-rose-600 dark:text-rose-400 font-medium">
                      ✕ {invalidRows.length} com inconsistência
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {invalidRows.length > 0 && (
                    <button
                      onClick={downloadErrorReport}
                      className="text-xs px-3 py-1.5 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-500/10 font-medium"
                    >
                      Baixar Relatório de Erros ({invalidRows.length})
                    </button>
                  )}
                  <button
                    onClick={handleConfirmImport}
                    disabled={isImporting || validRows.length === 0}
                    className="text-xs px-4 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50"
                  >
                    {isImporting ? "Gravando no Banco..." : `Confirmar e Gravar ${validRows.length} Matrículas`}
                  </button>
                </div>
              </div>

              {/* Tabela de Amostra Pré-visualizada */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted text-muted-foreground uppercase text-[10px] tracking-wider sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Linha</th>
                        <th className="py-2 px-3">Nome</th>
                        <th className="py-2 px-3">E-mail</th>
                        <th className="py-2 px-3">RA</th>
                        <th className="py-2 px-3">Turma Mapeada</th>
                        <th className="py-2 px-3">Validação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {validRows.slice(0, 15).map((r) => (
                        <tr key={`valid-${r.rowNumber}`} className="hover:bg-muted/30">
                          <td className="py-2 px-3 font-mono text-muted-foreground">{r.rowNumber}</td>
                          <td className="py-2 px-3 font-medium text-foreground">{r.name}</td>
                          <td className="py-2 px-3 text-muted-foreground">{r.email}</td>
                          <td className="py-2 px-3 font-mono">{r.ra}</td>
                          <td className="py-2 px-3">{r.classGroupLabel}</td>
                          <td className="py-2 px-3 text-emerald-600 font-medium">✓ Válido</td>
                        </tr>
                      ))}
                      {invalidRows.slice(0, 10).map((r) => (
                        <tr key={`invalid-${r.rowNumber}`} className="bg-rose-500/5 hover:bg-rose-500/10">
                          <td className="py-2 px-3 font-mono text-rose-500">{r.rowNumber}</td>
                          <td className="py-2 px-3 text-foreground">{r.name || "-"}</td>
                          <td className="py-2 px-3 text-muted-foreground">{r.email || "-"}</td>
                          <td className="py-2 px-3 font-mono">{r.ra || "-"}</td>
                          <td className="py-2 px-3">{r.turma || "-"}</td>
                          <td className="py-2 px-3 text-rose-600 dark:text-rose-400 font-medium">✕ {r.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <IndicatorFootnote base="Validação prévia local" periodo="Tempo real" fonte="Parser platform/lib/b2b/csv-enrollment.ts" />
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ABA 3: USUÁRIOS E PAPÉIS */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "usuarios" && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-semibold text-foreground text-base">Equipe e Membros da Instituição</h3>
                <p className="text-xs text-muted-foreground">
                  Dirigentes, Coordenadores, Docentes e Alunos com escopos atribuídos.
                </p>
              </div>
              {canManageRoles && (
                <button
                  onClick={() => {
                    setInviteModalOpen(true);
                    setInviteStatusMsg(null);
                  }}
                  className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
                >
                  + Convidar Usuário
                </button>
              )}
            </div>

            <DataTable
              data={initialMembers}
              keyExtractor={(m) => m.id}
              columns={[
                {
                  key: "name",
                  header: "Nome",
                  render: (m) => (
                    <div>
                      <div className="font-medium text-foreground">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.email}</div>
                    </div>
                  ),
                },
                {
                  key: "role",
                  header: "Papel",
                  render: (m) => {
                    const badgeStyles: Record<B2BRole, string> = {
                      dirigente: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
                      coordenador: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                      docente: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                      aluno: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                    };
                    return (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${badgeStyles[m.role]}`}>
                        {m.role}
                      </span>
                    );
                  },
                },
                {
                  key: "scopes",
                  header: "Escopo de Acesso",
                  render: (m) => {
                    if (m.role === "dirigente") return <span className="text-xs text-muted-foreground">Acesso Integral</span>;
                    if (m.role === "coordenador") {
                      return (
                        <span className="text-xs text-muted-foreground">
                          {m.scopedCourseIds.length > 0 ? `${m.scopedCourseIds.length} curso(s)` : "Todos os cursos"}
                        </span>
                      );
                    }
                    if (m.role === "docente") {
                      return (
                        <span className="text-xs text-muted-foreground">
                          {m.scopedClassGroupIds.length > 0 ? `${m.scopedClassGroupIds.length} turma(s)` : "Sem turmas atribuídas"}
                        </span>
                      );
                    }
                    return <span className="text-xs text-muted-foreground">Turma matriculada</span>;
                  },
                },
                {
                  key: "status",
                  header: "Status",
                  render: (m) => (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        m.is_active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {m.is_active ? "Ativo" : "Inativo"}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  header: "Ações",
                  render: (m) =>
                    canManageRoles &&
                    m.user_id !== context.userId && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            if (confirm(`Deseja ${m.is_active ? "desativar" : "reativar"} o acesso de ${m.name}?`)) {
                              toggleMemberActive(context.institution.id, m.id, !m.is_active);
                            }
                          }}
                          className={`text-xs hover:underline ${
                            m.is_active ? "text-rose-600" : "text-emerald-600 font-medium"
                          }`}
                        >
                          {m.is_active ? "Desativar" : "Reativar"}
                        </button>
                      </div>
                    ),
                },
              ]}
            />
            <IndicatorFootnote base="Membros institucionais" periodo="Atual" fonte="Tabelas public.institution_members e member_scopes" />
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ABA 4: PARÂMETROS DA INSTITUIÇÃO */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "parametros" && (
        <form onSubmit={handleSaveParams} className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-5">
            <div>
              <h3 className="font-semibold text-foreground text-base">Régua de Corte e Identidade Visual</h3>
              <p className="text-xs text-muted-foreground">
                Configurações operacionais conforme a Seção 0 e Seção 2 da Especificação Técnica B2B.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Corte de Referência */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Corte de Referência Padrão (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="0.5"
                    value={cutScore}
                    onChange={(e) => setCutScore(Number(e.target.value))}
                    disabled={!canManageRoles}
                    className="w-28 px-3 py-1.5 border border-border rounded-lg bg-background text-sm font-semibold text-foreground"
                  />
                  <span className="text-xs text-muted-foreground">
                    Padrão institucional: <strong>60%</strong> (Régua 60)
                  </span>
                </div>
              </div>

              {/* Logo URL para PDFs */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  URL do Logo Oficial (Cabeçalhos de Provas e Relatórios em PDF)
                </label>
                <input
                  type="url"
                  placeholder="https://suafaculdade.edu.br/logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  disabled={!canManageRoles}
                  className="w-full px-3 py-1.5 border border-border rounded-lg bg-background text-sm text-foreground"
                />
              </div>
            </div>

            <hr className="border-border" />

            {/* Alertas de Engajamento */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                Alertas de Engajamento Acadêmico (Desligados por Padrão)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {[
                  { key: "below_cut", label: "Sinalizar aluno com média abaixo do corte de referência" },
                  { key: "no_login", label: "Alertar quando aluno estiver sem login há mais de 7 dias" },
                  { key: "no_questions", label: "Alertar quando aluno não responder questões na semana" },
                  { key: "pace_drop", label: "Alertar sobre queda de ritmo de resolução > 30%" },
                ].map((alt) => (
                  <label key={alt.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean((alerts as any)[alt.key])}
                      onChange={(e) =>
                        setAlerts((prev) => ({ ...prev, [alt.key]: e.target.checked }))
                      }
                      disabled={!canManageRoles}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-foreground">{alt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <hr className="border-border" />

            {/* Meta Semanal de Questões */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="target-toggle"
                  checked={weeklyTargetEnabled}
                  onChange={(e) => setWeeklyTargetEnabled(e.target.checked)}
                  disabled={!canManageRoles}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="target-toggle" className="text-xs font-semibold text-foreground cursor-pointer">
                  Habilitar Meta Semanal de Questões Praticadas por Aluno
                </label>
              </div>

              {weeklyTargetEnabled && (
                <div className="flex items-center gap-3 pl-6">
                  <input
                    type="number"
                    min="10"
                    max="500"
                    step="10"
                    value={weeklyTargetQuestions}
                    onChange={(e) => setWeeklyTargetQuestions(Number(e.target.value))}
                    disabled={!canManageRoles}
                    className="w-24 px-3 py-1.5 border border-border rounded-lg bg-background text-sm font-semibold text-foreground"
                  />
                  <span className="text-xs text-muted-foreground">questões recomendadas por semana</span>
                </div>
              )}
            </div>

            <hr className="border-border" />

            {/* Parâmetros de Detecção de Sessões Atípicas (Voto SPR nº 9 / Seção 4.10) */}
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Detecção de Sessões Atípicas (Voto SPR nº 9 / Gestão Acadêmica)
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Limiares matemáticos configuráveis para sinalização pedagógica de padrões incomuns de resposta.
                  Sessões abaixo de 20 questões não são classificadas.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                {/* Mínimo de questões */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground">
                    Mínimo de Questões / Sessão
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={atypicalMinQuestions}
                    onChange={(e) => setAtypicalMinQuestions(Number(e.target.value))}
                    disabled={!canManageRoles}
                    className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-background text-xs text-foreground"
                  />
                  <span className="text-[10px] text-muted-foreground block">Padrão: 20 questões</span>
                </div>

                {/* Chute */}
                <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 block">
                    1. Padrão Chute
                  </span>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Tempo Máx (s):</label>
                    <input
                      type="number"
                      value={atypicalChuteMaxSeconds}
                      onChange={(e) => setAtypicalChuteMaxSeconds(Number(e.target.value))}
                      disabled={!canManageRoles}
                      className="w-full px-2 py-1 border border-border rounded bg-background text-xs text-foreground mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Acerto Máx (%):</label>
                    <input
                      type="number"
                      value={atypicalChuteMaxAccuracy}
                      onChange={(e) => setAtypicalChuteMaxAccuracy(Number(e.target.value))}
                      disabled={!canManageRoles}
                      className="w-full px-2 py-1 border border-border rounded bg-background text-xs text-foreground mt-0.5"
                    />
                  </div>
                </div>

                {/* Refazendo */}
                <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                  <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400 block">
                    2. Padrão Refazendo
                  </span>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Proporção Repetidas (0-1):</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={atypicalRefazendoMinRatio}
                      onChange={(e) => setAtypicalRefazendoMinRatio(Number(e.target.value))}
                      disabled={!canManageRoles}
                      className="w-full px-2 py-1 border border-border rounded bg-background text-xs text-foreground mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Acerto Mínimo (%):</label>
                    <input
                      type="number"
                      value={atypicalRefazendoMinAccuracy}
                      onChange={(e) => setAtypicalRefazendoMinAccuracy(Number(e.target.value))}
                      disabled={!canManageRoles}
                      className="w-full px-2 py-1 border border-border rounded bg-background text-xs text-foreground mt-0.5"
                    />
                  </div>
                </div>

                {/* Consulta Externa */}
                <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 block">
                    3. Consulta Externa
                  </span>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Acerto Mínimo (%):</label>
                    <input
                      type="number"
                      value={atypicalConsultaMinAccuracy}
                      onChange={(e) => setAtypicalConsultaMinAccuracy(Number(e.target.value))}
                      disabled={!canManageRoles}
                      className="w-full px-2 py-1 border border-border rounded bg-background text-xs text-foreground mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Tempo Máx (s):</label>
                    <input
                      type="number"
                      value={atypicalConsultaMaxSeconds}
                      onChange={(e) => setAtypicalConsultaMaxSeconds(Number(e.target.value))}
                      disabled={!canManageRoles}
                      className="w-full px-2 py-1 border border-border rounded bg-background text-xs text-foreground mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Desvio Padrão Máx (s):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={atypicalConsultaMaxStdDev}
                      onChange={(e) => setAtypicalConsultaMaxStdDev(Number(e.target.value))}
                      disabled={!canManageRoles}
                      className="w-full px-2 py-1 border border-border rounded bg-background text-xs text-foreground mt-0.5"
                    />
                  </div>
                </div>
              </div>
            </div>

            {paramFeedback && (
              <div
                className={`p-3 rounded-lg text-xs font-medium ${
                  paramFeedback.startsWith("Erro")
                    ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                    : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                }`}
              >
                {paramFeedback}
              </div>
            )}

            {canManageRoles && (
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isPending}
                  className="text-xs px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
                >
                  {isPending ? "Salvando..." : "Salvar Parâmetros"}
                </button>
              </div>
            )}
            <IndicatorFootnote base="Instituição" periodo="Vigência atual" fonte="Tabela public.institutions (cut_score, settings)" />
          </div>
        </form>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ABA 5: CHECKLIST DE IMPLANTAÇÃO */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "checklist" && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground text-base">Prontidão para Entrada em Operação</h3>
                <span className="text-xs font-bold text-primary">{checklist.progressPercent}% Concluído</span>
              </div>
              {/* Barra de Progresso */}
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${checklist.progressPercent}%` }}
                />
              </div>
            </div>

            <div className="divide-y divide-border">
              {checklist.items.map((item, idx) => (
                <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        item.ok
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {item.ok ? "✓" : idx + 1}
                    </span>
                    <span className={`font-medium ${item.ok ? "text-foreground" : "text-muted-foreground"}`}>
                      {item.label}
                    </span>
                  </div>

                  {item.ok ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Concluído</span>
                  ) : (
                    <button
                      onClick={() => setActiveTab(item.tab)}
                      className="text-primary hover:underline font-semibold"
                    >
                      Configurar →
                    </button>
                  )}
                </div>
              ))}
            </div>
            <IndicatorFootnote base="Auditoria de prontidão" periodo="Tempo real" fonte="Verificação automatizada do banco" />
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: NOVO / EDITAR CURSO */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {courseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-lg space-y-4">
            <h3 className="font-semibold text-foreground text-base">
              {editingCourse ? "Editar Curso" : "Novo Curso"}
            </h3>
            <div>
              <label className="text-xs font-medium text-foreground">Nome do Curso</label>
              <input
                type="text"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="Ex: Medicina"
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCourseModalOpen(false)}
                className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!courseName.trim()) return;
                  await saveCourse(context.institution.id, {
                    id: editingCourse?.id,
                    name: courseName,
                  });
                  setCourseModalOpen(false);
                  router.refresh();
                }}
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: NOVO / EDITAR TERMO LETIVO */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {termModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-lg space-y-4">
            <h3 className="font-semibold text-foreground text-base">
              {editingTerm ? "Editar Termo Letivo" : "Novo Termo Letivo"}
            </h3>
            <div>
              <label className="text-xs font-medium text-foreground">Rótulo (ex: 2027.1)</label>
              <input
                type="text"
                value={termLabel}
                onChange={(e) => setTermLabel(e.target.value)}
                placeholder="2027.1"
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Início (opcional)</label>
                <input
                  type="date"
                  value={termStartDate}
                  onChange={(e) => setTermStartDate(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 border border-border rounded-lg bg-background text-xs text-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Término (opcional)</label>
                <input
                  type="date"
                  value={termEndDate}
                  onChange={(e) => setTermEndDate(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 border border-border rounded-lg bg-background text-xs text-foreground"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTermModalOpen(false)}
                className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!termLabel.trim()) return;
                  await saveAcademicTerm(context.institution.id, {
                    id: editingTerm?.id,
                    label: termLabel,
                    start_date: termStartDate || null,
                    end_date: termEndDate || null,
                  });
                  setTermModalOpen(false);
                  router.refresh();
                }}
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: NOVA / EDITAR TURMA */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {classModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-lg space-y-4">
            <h3 className="font-semibold text-foreground text-base">
              {editingClass ? "Editar Turma" : "Nova Turma"}
            </h3>
            <div>
              <label className="text-xs font-medium text-foreground">Curso</label>
              <select
                value={classCourseId}
                onChange={(e) => setClassCourseId(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground"
              >
                {initialCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Período (1 a 12)</label>
                <select
                  value={classPeriod}
                  onChange={(e) => setClassPeriod(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((p) => (
                    <option key={p} value={p}>
                      {p}º Período
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Termo Letivo</label>
                <select
                  value={classTermId}
                  onChange={(e) => setClassTermId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground"
                >
                  <option value="">Sem termo</option>
                  {initialTerms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Rótulo / Identificação da Turma</label>
              <input
                type="text"
                value={classLabel}
                onChange={(e) => setClassLabel(e.target.value)}
                placeholder="Ex: MED-2027-8P ou Turma A"
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setClassModalOpen(false)}
                className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!classLabel.trim() || !classCourseId) return;
                  await saveClassGroup(context.institution.id, {
                    id: editingClass?.id,
                    course_id: classCourseId,
                    term_id: classTermId || null,
                    period: classPeriod,
                    label: classLabel,
                  });
                  setClassModalOpen(false);
                  router.refresh();
                }}
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: CONVIDAR USUÁRIO */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleSendInvite}
            className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-lg space-y-4"
          >
            <h3 className="font-semibold text-foreground text-base">Convidar Membro para {context.institution.name}</h3>
            <div>
              <label className="text-xs font-medium text-foreground">Nome Completo</label>
              <input
                type="text"
                required
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Ex: Dra. Mariana Albuquerque"
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">E-mail Profissional</label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="mariana@faculdade.edu.br"
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Papel Institucional</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as B2BRole)}
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground"
              >
                {context.isMedPleniAdmin && <option value="dirigente">Dirigente (Gestão Integral)</option>}
                <option value="coordenador">Coordenador de Curso</option>
                <option value="docente">Docente</option>
                <option value="aluno">Aluno Individual</option>
              </select>
            </div>

            {/* Escopos seletivos */}
            {inviteRole === "coordenador" && (
              <div>
                <label className="text-xs font-medium text-foreground">Cursos sob Coordenação (opcional)</label>
                <select
                  multiple
                  value={inviteScopes}
                  onChange={(e) =>
                    setInviteScopes(Array.from(e.target.selectedOptions, (option) => option.value))
                  }
                  className="w-full mt-1 p-2 border border-border rounded-lg bg-background text-xs text-foreground h-20"
                >
                  {initialCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground mt-0.5">Deixe vazio para coordenar todos os cursos.</p>
              </div>
            )}

            {inviteRole === "docente" && (
              <div>
                <label className="text-xs font-medium text-foreground">Turmas Atribuídas ao Docente</label>
                <select
                  multiple
                  value={inviteScopes}
                  onChange={(e) =>
                    setInviteScopes(Array.from(e.target.selectedOptions, (option) => option.value))
                  }
                  className="w-full mt-1 p-2 border border-border rounded-lg bg-background text-xs text-foreground h-24"
                >
                  {initialClassGroups.map((cg) => (
                    <option key={cg.id} value={cg.id}>
                      {cg.period}ºP - {cg.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground mt-0.5">Segure Ctrl/Cmd para selecionar múltiplas turmas.</p>
              </div>
            )}

            {context.institution.is_demo && (
              <div className="p-2.5 rounded-lg bg-muted text-muted-foreground text-[11px]">
                ℹ️ Esta instituição está em modo Demonstração. O convite é criado no banco, mas o disparo de e-mail via Resend é desativado.
              </div>
            )}

            {inviteStatusMsg && (
              <div
                className={`p-2.5 rounded-lg text-xs font-medium ${
                  inviteStatusMsg.startsWith("Erro")
                    ? "bg-rose-500/10 text-rose-600"
                    : "bg-emerald-500/10 text-emerald-600"
                }`}
              >
                {inviteStatusMsg}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90"
              >
                {isPending ? "Processando..." : "Gerar Convite"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
