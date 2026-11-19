"use client";

import React, { useState, useTransition } from "react";
import {
  GovernanceAuditRecord,
  IndividualAccessRecord,
  AUDIT_EVENT_LABELS,
  GovernanceAuditEventType,
  PRIVACY_AND_DATA_POLICY_SECTIONS,
} from "@/lib/b2b/governance";
import {
  anonymizeStudentDataAction,
  archiveInstitutionAction,
  exportAuditedDataAction,
} from "@/lib/b2b/governance-actions";

interface GovernancaClientProps {
  institution: {
    id: string;
    name: string;
    cutScore: number;
    isActive: boolean;
  };
  auditLogs: GovernanceAuditRecord[];
  accessLogs: IndividualAccessRecord[];
  studentsList: Array<{ userId: string; name: string; registration: string }>;
  userRole: string;
}

export default function GovernancaClient({
  institution,
  auditLogs: initialAuditLogs,
  accessLogs: initialAccessLogs,
  studentsList,
  userRole,
}: GovernancaClientProps) {
  const [activeTab, setActiveTab] = useState<"acessos" | "auditoria" | "privacidade" | "retencao">("acessos");
  const [selectedEventType, setSelectedEventType] = useState<string>("todos");
  const [auditLogs, setAuditLogs] = useState<GovernanceAuditRecord[]>(initialAuditLogs);
  const [accessLogs] = useState<IndividualAccessRecord[]>(initialAccessLogs);
  const [accessSearch, setAccessSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Estados da Anonimização
  const [selectedStudentForAnon, setSelectedStudentForAnon] = useState<string>("");
  const [anonReason, setAnonReason] = useState<string>("Solicitação formal de discente com base no Art. 18 da LGPD.");
  const [isAnonModalOpen, setIsAnonModalOpen] = useState(false);

  // Estados do Encerramento
  const [archiveReason, setArchiveReason] = useState<string>("Término de convênio institucional.");
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  // Modal de Dicionário de Dados Exportado
  const [exportedDict, setExportedDict] = useState<any[] | null>(null);

  // Filtro de logs de auditoria
  const filteredAuditLogs = selectedEventType === "todos"
    ? auditLogs
    : auditLogs.filter((log) => log.eventType === selectedEventType);

  // Filtro de logs de acesso individual
  const filteredAccessLogs = accessLogs.filter((log) => {
    if (!accessSearch) return true;
    const term = accessSearch.toLowerCase();
    return (
      log.studentName?.toLowerCase().includes(term) ||
      log.accessedByName?.toLowerCase().includes(term) ||
      log.studentRegistration?.toLowerCase().includes(term) ||
      log.context?.toLowerCase().includes(term)
    );
  });

  const handleExportAccessLogs = () => {
    startTransition(async () => {
      const res = await exportAuditedDataAction({
        institutionId: institution.id,
        exportType: "executive_report",
        targetTitle: "Log de Acessos a Dados Individuais (LGPD)",
        rowsCount: filteredAccessLogs.length,
        purpose: "Auditoria interna de governança e proteção de dados",
      });

      if (res.success) {
        setExportedDict(res.dictionary);
        setFeedbackMessage(res.message);

        // Dispara download do CSV no navegador
        const headers = ["ID", "Data_Hora", "Acessado_Por", "Papel", "Discente_Acessado", "Contexto", "Justificativa"];
        const rows = filteredAccessLogs.map((l) => [
          l.id,
          l.createdAt,
          l.accessedByName,
          l.accessedByRole,
          l.studentName || l.studentUserId,
          l.context,
          l.justification || "",
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `auditoria_acessos_${institution.id}_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  };

  const handleConfirmAnon = () => {
    if (!selectedStudentForAnon) return;
    startTransition(async () => {
      const res = await anonymizeStudentDataAction({
        institutionId: institution.id,
        studentUserId: selectedStudentForAnon,
        reason: anonReason,
      });

      setIsAnonModalOpen(false);
      setFeedbackMessage(res.message);

      if (res.success) {
        // Atualiza a lista local de logs
        const newLog: GovernanceAuditRecord = {
          id: `log-anon-${Date.now()}`,
          institutionId: institution.id,
          eventType: "anonimizacao_aluno",
          performedBy: "usr-dirigente",
          performedByName: "Dirigente Institucional",
          performedByRole: "dirigente",
          targetId: selectedStudentForAnon,
          targetLabel: "Estudante Desidentificado",
          details: { reason: anonReason },
          createdAt: new Date().toISOString(),
        };
        setAuditLogs((prev) => [newLog, ...prev]);
      }
    });
  };

  const handleConfirmArchive = () => {
    startTransition(async () => {
      const res = await archiveInstitutionAction({
        institutionId: institution.id,
        reason: archiveReason,
      });

      setIsArchiveModalOpen(false);
      setFeedbackMessage(res.message);
    });
  };

  return (
    <div className="space-y-6">
      {/* ── 1. CABEÇALHO DO MÓDULO ── */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary mb-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Conformidade LGPD &amp; Segurança Regulatória
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Governança, Privacidade e Auditoria
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Painel exclusivo da direção para fiscalização de acessos a dados individuais de alunos,
              trilha imutável de eventos operacionais e rotinas de retenção e conformidade.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 rounded-lg border border-border bg-muted/40 font-mono text-muted-foreground">
              Trilha: PostgreSQL Imutável (Trigger-protected)
            </span>
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="flex items-center gap-1 border-b border-border mt-6 overflow-x-auto text-xs font-semibold">
          {[
            { id: "acessos", label: "Acessos a Dados Individuais" },
            { id: "auditoria", label: "Trilha de Auditoria Imutável" },
            { id: "privacidade", label: "Privacidade & Dados" },
            { id: "retencao", label: "Retenção, Anonimização & Exclusão" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 border-b-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback contextual */}
      {feedbackMessage && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between">
          <span>{feedbackMessage}</span>
          <button onClick={() => setFeedbackMessage(null)} className="text-xs hover:underline">
            Fechar
          </button>
        </div>
      )}

      {/* ── ABA 1: CONSULTA AO REGISTRO DE ACESSO A DADOS INDIVIDUAIS ── */}
      {activeTab === "acessos" && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Registro de Acessos a Perfis Individuais
              </h2>
              <p className="text-xs text-muted-foreground">
                Histórico auditado de todas as visualizações a dados sensíveis de discentes por docentes e gestores
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Buscar por discente ou autor..."
                value={accessSearch}
                onChange={(e) => setAccessSearch(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs w-56"
              />
              <button
                onClick={handleExportAccessLogs}
                disabled={isPending}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition shadow-sm flex items-center gap-1.5 shrink-0"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Exportar com Dicionário
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Data / Hora</th>
                  <th className="py-2.5 px-3">Autor do Acesso</th>
                  <th className="py-2.5 px-3">Papel</th>
                  <th className="py-2.5 px-3">Estudante Acessado</th>
                  <th className="py-2.5 px-3">Contexto</th>
                  <th className="py-2.5 px-3">Justificativa Acadêmica</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAccessLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
                      Nenhum registro de acesso individual localizado para os critérios informados.
                    </td>
                  </tr>
                ) : (
                  filteredAccessLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30">
                      <td className="py-3 px-3 text-muted-foreground font-mono whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="py-3 px-3 font-semibold text-foreground">
                        {log.accessedByName}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-muted text-muted-foreground">
                          {log.accessedByRole}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-foreground">
                        {log.studentName || log.studentUserId}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {log.context}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground italic">
                        {log.justification || "Acompanhamento formativo"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ABA 2: TRILHA DE AUDITORIA IMUTÁVEL ── */}
      {activeTab === "auditoria" && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Trilha de Auditoria Imutável do Sistema
              </h2>
              <p className="text-xs text-muted-foreground">
                Eventos críticos protegidos por trigger no banco contra alteração ou exclusão
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Filtrar por Evento:</span>
              <select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold"
              >
                <option value="todos">Todos os Eventos ({auditLogs.length})</option>
                {Object.entries(AUDIT_EVENT_LABELS).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Data / Hora</th>
                  <th className="py-2.5 px-3">Evento Auditado</th>
                  <th className="py-2.5 px-3">Responsável</th>
                  <th className="py-2.5 px-3">Alvo da Ação</th>
                  <th className="py-2.5 px-3">Detalhes e Parâmetros</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground text-xs">
                      Nenhum evento registrado para o filtro selecionado.
                    </td>
                  </tr>
                ) : (
                  filteredAuditLogs.map((log) => {
                    const eventMeta = AUDIT_EVENT_LABELS[log.eventType] || { label: log.eventType, severity: "info" };
                    return (
                      <tr key={log.id} className="hover:bg-muted/30">
                        <td className="py-3 px-3 text-muted-foreground font-mono whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("pt-BR")}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              eventMeta.severity === "critical"
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
                                : eventMeta.severity === "warning"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                                : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20"
                            }`}
                          >
                            {eventMeta.label}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-foreground">{log.performedByName}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">{log.performedByRole}</div>
                        </td>
                        <td className="py-3 px-3 font-medium text-foreground">
                          {log.targetLabel || log.targetId || "Institucional"}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground max-w-xs truncate">
                          {JSON.stringify(log.details)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ABA 3: POLÍTICA DE PRIVACIDADE E DADOS (TEXTO EDITÁVEL) ── */}
      {activeTab === "privacidade" && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-bold text-foreground">
              Política de Privacidade e Governança de Dados da Instituição
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Transparência pública sobre a coleta, finalidades educacionais, permissões e diretrizes de sigilo
            </p>
          </div>

          <div className="space-y-6">
            {PRIVACY_AND_DATA_POLICY_SECTIONS.map((sec) => (
              <div key={sec.id} className="p-4 border border-border rounded-xl bg-muted/10 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">{sec.title}</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
                    {sec.responsibleLegalNote}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {sec.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ABA 4: RETENÇÃO, ANONIMIZAÇÃO E ENCERRAMENTO ── */}
      {activeTab === "retencao" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Anonimização de Estudante */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Anonimização a Pedido (LGPD Art. 18)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Desidentificação permanente dos dados pessoais de um discente
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Esta ação desassocia de forma irreversível o nome, e-mail e RA do estudante da base de dados.
              Os registros de respostas e médias numéricas são mantidos anonimizados para preservar o
              histórico psicométrico e a curva de notas da turma.
            </p>

            <button
              onClick={() => setIsAnonModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition shadow-sm"
            >
              Iniciar Anonimização de Estudante
            </button>
          </div>

          {/* Card 2: Encerramento de Instituição */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Encerramento e Arquivamento Institucional
                </h3>
                <p className="text-xs text-muted-foreground">
                  Inativação de contrato com exportação integral do acervo
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Gera o manifesto completo de auditoria e exporta todas as avaliações, folhas corrigidas e
              provas geradas em arquivo criptografado para custódia da instituição, inativando o acesso
              operacional da faculdade na plataforma.
            </p>

            <button
              onClick={() => setIsArchiveModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition shadow-sm"
            >
              Exportar Acervo e Encerrar Instituição
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL DE ANONIMIZAÇÃO ── */}
      {isAnonModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-foreground">
              Confirmar Anonimização de Estudante
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Selecione o estudante que formalizou o pedido de anonimização com base na LGPD.
            </p>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Selecione o Estudante:
              </label>
              <select
                value={selectedStudentForAnon}
                onChange={(e) => setSelectedStudentForAnon(e.target.value)}
                className="w-full p-2 border border-border rounded-lg bg-background text-xs"
              >
                <option value="">Selecione...</option>
                {studentsList.map((s) => (
                  <option key={s.userId} value={s.userId}>
                    {s.name} ({s.registration})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Justificativa / Protocolo Formal:
              </label>
              <textarea
                rows={2}
                value={anonReason}
                onChange={(e) => setAnonReason(e.target.value)}
                className="w-full p-2 border border-border rounded-lg bg-background text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsAnonModalOpen(false)}
                className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selectedStudentForAnon || isPending}
                onClick={handleConfirmAnon}
                className="px-4 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 disabled:opacity-50"
              >
                {isPending ? "Processando..." : "Confirmar e Anonimizar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE ENCERRAMENTO ── */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-foreground">
              Encerrar Instituição e Custodiar Acervo
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O encerramento gerará o arquivo com todo o histórico avaliativo e marcará a instituição como inativa.
            </p>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Motivo do Encerramento:
              </label>
              <textarea
                rows={2}
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                className="w-full p-2 border border-border rounded-lg bg-background text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(false)}
                className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmArchive}
                className="px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
              >
                {isPending ? "Exportando..." : "Confirmar Encerramento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DO DICIONÁRIO DE DADOS EXPORTADO ── */}
      {exportedDict && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-xl w-full p-6 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Dicionário de Dados da Exportação</h3>
                <p className="text-xs text-muted-foreground">
                  Estrutura técnica e base legal dos campos exportados
                </p>
              </div>
              <button onClick={() => setExportedDict(null)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {exportedDict.map((item, idx) => (
                <div key={idx} className="p-3 border border-border rounded-lg bg-muted/20 text-xs space-y-1">
                  <div className="flex items-center justify-between font-mono font-bold text-foreground">
                    <span>{item.fieldName}</span>
                    <span className="text-[10px] text-muted-foreground">{item.dataType}</span>
                  </div>
                  <p className="text-muted-foreground">{item.description}</p>
                  <div className="text-[10px] text-primary pt-0.5">
                    <strong>Base Legal:</strong> {item.legalBase}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <button
                onClick={() => setExportedDict(null)}
                className="px-4 py-2 bg-secondary text-secondary-foreground text-xs font-semibold rounded-lg hover:bg-secondary/80"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RODAPÉ PADRONIZADO BASE / PERÍODO / FONTE ── */}
      <div className="bg-card border border-border rounded-xl p-4 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span><strong>Base:</strong> Auditoria integral de governança ({accessLogs.length} acessos individuais monitorados)</span>
          <span className="hidden sm:inline">·</span>
          <span><strong>Período:</strong> Semestre Letivo 2026.1</span>
          <span className="hidden sm:inline">·</span>
          <span><strong>Fonte:</strong> Tabelas imutáveis b2b_governance_audit_logs e individual_access_log</span>
        </div>
        <div>
          Conformidade LGPD Art. 18 / 37
        </div>
      </div>
    </div>
  );
}
