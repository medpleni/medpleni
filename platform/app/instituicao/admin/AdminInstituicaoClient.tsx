"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, DataTable, IndicatorFootnote } from "@/components/b2b";
import type { B2BUserContext, Institution, B2BPlan } from "@/lib/b2b/types";
import { adminCreateInstitution, adminEnterAsSupport } from "@/lib/b2b/config-actions";

interface Props {
  context: B2BUserContext;
  institutions: (Institution & { studentCount?: number })[];
}

export default function AdminInstituicaoClient({ context, institutions }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modal Criar Instituição
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [initials, setInitials] = useState("");
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState<B2BPlan>("plus");
  const [cutScore, setCutScore] = useState(60);
  const [isDemo, setIsDemo] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal Entrar como Suporte
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [selectedInst, setSelectedInst] = useState<Institution | null>(null);
  const [supportReason, setSupportReason] = useState("");
  const [supportError, setSupportError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    startTransition(async () => {
      try {
        await adminCreateInstitution({
          name,
          initials,
          slug,
          plan,
          cut_score: Number(cutScore),
          is_demo: isDemo,
        });

        setName("");
        setInitials("");
        setSlug("");
        setCreateModalOpen(false);
        router.refresh();
      } catch (err: any) {
        setFormError(err.message || "Falha ao criar instituição.");
      }
    });
  };

  const handleEnterSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInst) return;
    setSupportError(null);

    startTransition(async () => {
      try {
        const res = await adminEnterAsSupport(selectedInst.id, supportReason);
        if (res.success) {
          router.push("/instituicao");
          router.refresh();
        }
      } catch (err: any) {
        setSupportError(err.message || "Erro ao iniciar sessão de suporte.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader
          title="Administração Global MedPleni (B2B)"
          subtitle="Implantação de novas faculdades contratantes, gestão de planos e acesso de suporte auditado"
        />
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => router.push("/instituicao/admin/motor")}
            className="px-3 py-2 border border-border bg-card hover:bg-muted text-foreground rounded-lg text-xs font-semibold shadow-xs"
          >
            Motor IA (Piloto) →
          </button>
          <button
            onClick={() => router.push("/instituicao/admin/classificacao")}
            className="px-3 py-2 border border-border bg-card hover:bg-muted text-foreground rounded-lg text-xs font-semibold shadow-xs"
          >
            Taxonomia Médica (4 Eixos) →
          </button>
          <button
            onClick={() => {
              setFormError(null);
              setCreateModalOpen(true);
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-xs font-semibold shadow-xs"
          >
            + Nova Instituição
          </button>
        </div>
      </div>

      {/* Tabela de Instituições */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
        <div className="mb-4">
          <h3 className="font-semibold text-foreground text-base">Instituições de Ensino Cadastradas</h3>
          <p className="text-xs text-muted-foreground">
            Todas as faculdades ativas no ecossistema MedPleni B2B
          </p>
        </div>

        <DataTable
          data={institutions}
          keyExtractor={(i) => i.id}
          columns={[
            {
              key: "name",
              header: "Instituição",
              render: (i) => (
                <div>
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    {i.name}
                    {i.is_demo && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        DEMO
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {i.initials} • slug: {i.slug}
                  </div>
                </div>
              ),
            },
            {
              key: "plan",
              header: "Plano Contratado",
              render: (i) => {
                const planLabels: Record<B2BPlan, { label: string; style: string }> = {
                  vazia: { label: "Plataforma Vazia", style: "bg-muted text-muted-foreground" },
                  acervo: { label: "Com Acervo", style: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
                  plus: { label: "Plus (Acervo + Mentoria)", style: "bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold" },
                };
                const p = planLabels[i.plan] || { label: i.plan, style: "bg-muted text-muted-foreground" };
                return (
                  <span className={`text-xs px-2.5 py-0.5 rounded-full ${p.style}`}>
                    {p.label}
                  </span>
                );
              },
            },
            {
              key: "cut_score",
              header: "Corte",
              render: (i) => (
                <span className="font-semibold text-xs text-foreground">
                  {i.cut_score}%
                </span>
              ),
            },
            {
              key: "actions",
              header: "Ações",
              render: (i) => (
                <button
                  onClick={() => {
                    setSelectedInst(i);
                    setSupportReason("");
                    setSupportError(null);
                    setSupportModalOpen(true);
                  }}
                  className="text-xs px-3 py-1 border border-primary/30 text-primary rounded-lg hover:bg-primary/10 font-semibold transition-colors"
                >
                  Entrar como suporte →
                </button>
              ),
            },
          ]}
        />
        <IndicatorFootnote base="Catálogo geral MedPleni" periodo="Tempo real" fonte="Tabela public.institutions" />
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: CRIAR INSTITUIÇÃO */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleCreate}
            className="bg-card border border-border rounded-xl p-6 max-w-lg w-full shadow-lg space-y-4"
          >
            <h3 className="font-semibold text-foreground text-base">Cadastrar Nova Instituição (B2B)</h3>

            <div>
              <label className="text-xs font-medium text-foreground">Nome da Instituição</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slug) {
                    setSlug(
                      e.target.value
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .replace(/[^a-z0-9]/g, "-")
                        .replace(/-+/g, "-")
                    );
                  }
                }}
                placeholder="Ex: Faculdade de Medicina de Botucatu"
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Sigla Oficial</label>
                <input
                  type="text"
                  required
                  value={initials}
                  onChange={(e) => setInitials(e.target.value.toUpperCase())}
                  placeholder="Ex: FMB"
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground uppercase font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Slug URL</label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  placeholder="fmb"
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Plano Contratado</label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as B2BPlan)}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground"
                >
                  <option value="vazia">Plataforma Vazia</option>
                  <option value="acervo">Com Acervo</option>
                  <option value="plus">Plus (Acervo + Apexus)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Corte Padrão (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={cutScore}
                  onChange={(e) => setCutScore(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground"
                />
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={isDemo}
                  onChange={(e) => setIsDemo(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-foreground font-medium">
                  Instituição em Modo Demonstração (bloqueia envio de e-mails reais)
                </span>
              </label>
            </div>

            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-600 text-xs font-medium">
                {formError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90"
              >
                {isPending ? "Criando..." : "Criar Instituição"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: ENTRAR COMO SUPORTE (AUDITADO) */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {supportModalOpen && selectedInst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleEnterSupport}
            className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-lg space-y-4"
          >
            <div>
              <h3 className="font-semibold text-foreground text-base">Acesso de Suporte Auditado</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Você entrará na instituição <strong>{selectedInst.name}</strong> com poderes administrativos.
                Em conformidade com a LGPD e governança MedPleni, todo acesso requer justificativa registrada em log.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Motivo do Acesso de Suporte</label>
              <textarea
                required
                rows={3}
                value={supportReason}
                onChange={(e) => setSupportReason(e.target.value)}
                placeholder="Ex: Verificação de configuração de turmas e auditoria de simulação solicitada pela coordenação."
                className="w-full mt-1 p-2.5 border border-border rounded-lg bg-background text-xs text-foreground resize-none"
              />
            </div>

            {supportError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-600 text-xs font-medium">
                {supportError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSupportModalOpen(false)}
                className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90"
              >
                {isPending ? "Registrando Acesso..." : "Confirmar e Entrar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
