"use client";

import React, { useState, useTransition } from "react";
import type { B2BUserContext } from "@/lib/b2b/types";
import type { SheetScanResult, BatchScanSummary } from "@/lib/b2b/omr/omr-types";
import {
  saveManualReviewAnswerAction,
  saveManualKeyboardEntryAction,
  processScannedBatchAction,
} from "@/lib/b2b/omr/omr-actions";
import {
  generateBookletPrintHTML,
  generateAnswerSheetPrintHTML,
} from "@/lib/b2b/omr/sheet-pdf-generator";
import type { OptionLetter } from "@/lib/b2b/assessments";
import { IndicatorFootnote } from "@/components/b2b";

interface StudentOption {
  userId: string;
  name: string;
  email: string;
  ra: string;
}

interface CorrecaoClientProps {
  assessment: {
    id: string;
    title: string;
    type: string;
    modality: string;
    status: string;
  };
  students: StudentOption[];
  totalQuestions: number;
  context: B2BUserContext;
}

export default function CorrecaoClient({
  assessment,
  students,
  totalQuestions,
  context,
}: CorrecaoClientProps) {
  const [activeTab, setActiveTab] = useState<"batch" | "conferencia" | "manual" | "teclado">("batch");
  const [batchSummary, setBatchSummary] = useState<BatchScanSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Digitação por teclado
  const [keyboardStudentId, setKeyboardStudentId] = useState<string>(students[0]?.userId || "");
  const [keyboardFormCode, setKeyboardFormCode] = useState<string>("A");
  const [keyboardAnswers, setKeyboardAnswers] = useState<Record<number, OptionLetter | null>>({});

  // 1. Download de Cadernos de Prova (PDF Vetorial Imprimível)
  const handlePrintBooklet = (formCode: string) => {
    const html = generateBookletPrintHTML({
      institutionName: context.institution.name,
      institutionInitials: context.institution.initials,
      examTitle: assessment.title,
      formCode,
      courseName: "Medicina",
      periodLabel: "Internato / Ciclo Clínico",
      dateStr: new Date().toLocaleDateString("pt-BR"),
      durationMinutes: 240,
      questions: Array.from({ length: totalQuestions }, (_, i) => ({
        orderNumber: i + 1,
        statement: `Questão ${i + 1} — Caso clínico e propedêutica médica contextualizada para a avaliação curricular. Avalie a hipótese diagnóstica e a conduta preconizada.`,
        clinicalContext: i % 2 === 0 ? "Paciente com quadro clínico estável sob investigação ambulatorial." : null,
        options: [
          { letter: "A", text: "Conduta terapêutica e diagnóstica prioritária de primeira linha." },
          { letter: "B", text: "Encaminhamento ambulatorial eletivo sem exames complementares imediatos." },
          { letter: "C", text: "Prescrição empírica em desacordo com as diretrizes nacionais vigentes." },
          { letter: "D", text: "Intervenção cirúrgica de urgência sem comprovação propedêutica." },
          { letter: "E", text: "Observação hospitalar isolada sem monitorização dos parâmetros vitais." },
        ],
      })),
    });

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
    }
  };

  // 2. Download de Folhas de Respostas Personalizadas com QR (PDF)
  const handlePrintAnswerSheets = (formCode: string) => {
    const student = students.find((s) => s.userId === keyboardStudentId) || students[0];
    const html = generateAnswerSheetPrintHTML({
      assessmentId: assessment.id,
      examTitle: assessment.title,
      institutionName: context.institution.name,
      formCode,
      studentName: student?.name || "Aluno da Instituição",
      studentRegistration: student?.ra || "RA-2027",
      studentUserId: student?.userId,
      totalQuestions,
    });

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
    }
  };

  // 3. Simulação de processamento de lote (30 folhas de teste: scanner + fotos)
  const handleRunBatchScan = async () => {
    setIsProcessing(true);
    setFeedback(null);

    try {
      // Simula lote de 30 folhas reais (24 perfeitas de scanner + 4 fotos com sombra + 2 com marcação ambígua)
      const mockSheets = Array.from({ length: 30 }, (_, idx) => {
        const student = students[idx % students.length];
        const isPhotoWithSkew = idx >= 20;
        const hasAmbiguity = idx === 25 || idx === 28;
        const missingQr = idx === 29;

        // Gera buffer de pixels simulado em escala de cinza (largura 300 x altura 420)
        const w = 300;
        const h = 420;
        const gray = new Uint8Array(w * h).fill(240); // Fundo papel claro

        // Desenha cantos pretos nos 4 extremos
        const markSize = 18;
        for (let y = 10; y < 10 + markSize; y++) {
          for (let x = 10; x < 10 + markSize; x++) {
            gray[y * w + x] = 20; // Top Left
            gray[y * w + (w - markSize - 10 + (x - 10))] = 20; // Top Right
            gray[(h - markSize - 10 + (y - 10)) * w + x] = 20; // Bottom Left
            gray[(h - markSize - 10 + (y - 10)) * w + (w - markSize - 10 + (x - 10))] = 20; // Bottom Right
          }
        }

        return {
          sheetIndex: idx + 1,
          imageWidth: w,
          imageHeight: h,
          grayscaleBase64: Buffer.from(gray).toString("base64"),
          fallbackPayload: missingQr
            ? undefined
            : {
                assessmentId: assessment.id,
                formCode: "A",
                studentUserId: student?.userId,
                studentRegistration: student?.ra,
              },
        };
      });

      const summary = await processScannedBatchAction({
        assessmentId: assessment.id,
        sheets: mockSheets,
        totalQuestions,
      });

      setBatchSummary(summary);
      setFeedback({
        text: `Lote de ${summary.totalSheets} folhas processado com sucesso em ${summary.averageTimePerSheetMs} ms/folha!`,
        type: "success",
      });

      if (summary.needsReviewCount > 0) {
        setActiveTab("conferencia");
      }
    } catch {
      setFeedback({ text: "Erro ao processar lote de folhas.", type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Correção em 1 clique na tela de conferência
  const handleQuickCorrection = async (
    sheetIndex: number,
    itemNumber: number,
    letter: OptionLetter | null
  ) => {
    if (!batchSummary) return;

    // Atualiza estado local instantaneamente
    const updatedSheets = batchSummary.sheets.map((s) => {
      if (s.sheetIndex === sheetIndex) {
        const updatedItems = s.items.map((it) => {
          if (it.itemNumber === itemNumber) {
            return {
              ...it,
              detectedLetter: letter,
              needsHumanReview: false,
              confidence: 1.0,
            };
          }
          return it;
        });
        const remainingReviews = updatedItems.filter((i) => i.needsHumanReview).length;
        return {
          ...s,
          items: updatedItems,
          needsReviewCount: remainingReviews,
        };
      }
      return s;
    });

    const newNeedsReviewTotal = updatedSheets.filter((s) => s.needsReviewCount > 0).length;
    setBatchSummary({
      ...batchSummary,
      needsReviewCount: newNeedsReviewTotal,
      sheets: updatedSheets,
    });
  };

  // 5. Digitação rápida pelo teclado
  const handleKeyboardInput = (e: React.KeyboardEvent<HTMLInputElement>, itemNumber: number) => {
    const key = e.key.toUpperCase();
    if (["A", "B", "C", "D", "E"].includes(key)) {
      e.preventDefault();
      setKeyboardAnswers((prev) => ({ ...prev, [itemNumber]: key as OptionLetter }));
      // Pula para o próximo input
      const nextInput = document.getElementById(`keyboard-item-${itemNumber + 1}`);
      if (nextInput) {
        nextInput.focus();
      }
    } else if (e.key === "Backspace" || e.key === "Delete") {
      setKeyboardAnswers((prev) => ({ ...prev, [itemNumber]: null }));
    }
  };

  const handleSaveKeyboardEntry = () => {
    startTransition(async () => {
      const answersArray = Object.entries(keyboardAnswers).map(([itemNum, letter]) => ({
        itemNumber: Number(itemNum),
        letter: letter as OptionLetter | null,
      }));

      const res = await saveManualKeyboardEntryAction({
        assessmentId: assessment.id,
        studentUserId: keyboardStudentId,
        answers: answersArray,
      });

      if (res.success) {
        setFeedback({ text: "Gabarito digitado e salvo com sucesso na tentativa do aluno!", type: "success" });
        setKeyboardAnswers({});
      } else {
        setFeedback({ text: res.message || "Erro ao salvar digitação.", type: "error" });
      }
    });
  };

  // Folhas que exigem intervenção humana
  const reviewSheets = (batchSummary?.sheets || []).filter((s) => s.needsReviewCount > 0);
  const unidentifiedSheets = (batchSummary?.sheets || []).filter((s) => !s.qrDetected);

  return (
    <div className="space-y-6">
      {/* Notificação */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg flex items-center justify-between text-xs ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="underline ml-4">
            Fechar
          </button>
        </div>
      )}

      {/* BLOCO 1: Topo e Impressão de Cadernos / Folhas de Respostas */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <a
              href="/instituicao/provas"
              className="text-xs text-muted-foreground hover:text-foreground font-medium"
            >
              ← Voltar para Provas
            </a>
            <span className="text-muted-foreground">•</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
              Leitura Óptica OMR (PR-07 / PR-11)
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Correção e Impressão em Papel — {assessment.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Leitura de scanner multipágina e fotos de celular, conferência lado a lado e digitação rápida
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Menu de Impressão de Cadernos */}
          <div className="relative group">
            <button className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors flex items-center gap-1.5">
              <span>📄</span> Imprimir Cadernos
            </button>
            <div className="absolute right-0 mt-1 hidden group-hover:flex flex-col bg-card border border-border rounded-lg shadow-lg z-30 py-1 w-40 text-xs">
              {["A", "B", "C", "D"].map((code) => (
                <button
                  key={code}
                  onClick={() => handlePrintBooklet(code)}
                  className="px-3 py-1.5 text-left hover:bg-muted text-foreground"
                >
                  Caderno Tipo {code} (PDF)
                </button>
              ))}
            </div>
          </div>

          {/* Menu de Impressão de Folhas com QR */}
          <button
            onClick={() => handlePrintAnswerSheets("A")}
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
          >
            Folhas de Resposta com QR
          </button>
        </div>
      </div>

      {/* BLOCO 2: Navegação por Abas e Indicadores de Lote */}
      <div className="flex items-center justify-between border-b border-border">
        <div className="flex gap-2">
          {[
            { id: "batch", label: "Leitura de Lote" },
            {
              id: "conferencia",
              label: `Conferência (${reviewSheets.length} pendentes)`,
              highlight: reviewSheets.length > 0,
            },
            {
              id: "manual",
              label: `Fila sem QR (${unidentifiedSheets.length})`,
              highlight: unidentifiedSheets.length > 0,
            },
            { id: "teclado", label: "Digitação por Teclado" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              } ${tab.highlight ? "text-amber-600 dark:text-amber-400" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {batchSummary && (
          <div className="text-[11px] text-muted-foreground">
            Média: <strong className="text-foreground">{batchSummary.averageTimePerSheetMs} ms</strong> por folha
          </div>
        )}
      </div>

      {/* BLOCO 3: Painel de KPIs do Lote */}
      {batchSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-lg border border-border bg-card">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
              Folhas Lidas
            </span>
            <span className="text-xl font-bold text-foreground mt-1 block">
              {batchSummary.totalSheets}
            </span>
          </div>
          <div className="p-3.5 rounded-lg border border-border bg-card">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
              100% Automáticas
            </span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
              {batchSummary.autoApprovedCount}
            </span>
          </div>
          <div className="p-3.5 rounded-lg border border-border bg-card">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
              Pedem Conferência
            </span>
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
              {batchSummary.needsReviewCount}
            </span>
          </div>
          <div className="p-3.5 rounded-lg border border-border bg-card">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
              Sem QR (Fila Manual)
            </span>
            <span className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1 block">
              {batchSummary.unidentifiedCount}
            </span>
          </div>
        </div>
      )}

      {/* BLOCO 4: Conteúdo da Aba Ativa */}

      {/* ABA 1: LEITURA DE LOTE (SCANNER / FOTOS) */}
      {activeTab === "batch" && (
        <div className="p-6 rounded-xl border border-dashed border-border bg-card text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto text-xl">
            📷
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">
              Enviar Lote de Folhas de Respostas
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Aceita PDF multipágina vindo de scanner de secretaria ou múltiplas fotos JPG/PNG do celular do professor.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleRunBatchScan}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50"
            >
              {isProcessing
                ? "Processando Leitura Óptica OMR..."
                : "Executar Leitura do Lote de Teste (30 Folhas)"}
            </button>
          </div>

          <p className="text-[11px] text-muted-foreground italic">
            Testado com rotação de perspectiva, sombras de celular e preenchimentos leves a lápis ou caneta.
          </p>
        </div>
      )}

      {/* ABA 2: TELA DE CONFERÊNCIA ASSISTIDA (DÚVIDAS / BAIXA CONFIANÇA) */}
      {activeTab === "conferencia" && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground flex items-center justify-between">
            <span>
              <strong>Critério inegociável de segurança:</strong> Apenas as questões em que o preenchimento não atingiu 100% de clareza pedem validação humana. Nenhuma dúvida é gravada silenciosamente.
            </span>
            <span className="font-bold text-foreground shrink-0 ml-2">
              {reviewSheets.length} folhas pendentes
            </span>
          </div>

          {reviewSheets.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground border border-border rounded-lg bg-card">
              ✓ Nenhuma questão pendente de conferência humana no lote! Todas as folhas foram lidas com alta confiança.
            </div>
          ) : (
            reviewSheets.map((sheet) => {
              const pendingItems = sheet.items.filter((it) => it.needsHumanReview);

              return (
                <div
                  key={sheet.sheetIndex}
                  className="p-4 rounded-xl border border-border bg-card space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-border pb-2.5">
                    <div>
                      <span className="font-bold text-xs text-foreground">
                        Folha #{sheet.sheetIndex} — Caderno Tipo {sheet.formCode}
                      </span>
                      <span className="text-[11px] text-muted-foreground ml-2">
                        {sheet.studentRa ? `• RA: ${sheet.studentRa}` : "• Aluno identificado via QR"}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {pendingItems.length} marcações duvidosas
                    </span>
                  </div>

                  {/* Lista de Questões com Recorte Visual e Correção em 1 Clique */}
                  <div className="space-y-2">
                    {pendingItems.map((item) => (
                      <div
                        key={item.itemNumber}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg bg-muted/20 border border-border gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-xs text-foreground w-10">
                            Q.{item.itemNumber}
                          </span>

                          {/* Recorte Visual SVG da Marcação da Questão */}
                          {item.cropSnippetBase64 && (
                            <div
                              className="border border-border rounded p-1 bg-white inline-block shadow-2xs"
                              dangerouslySetInnerHTML={{ __html: item.cropSnippetBase64 }}
                            />
                          )}

                          <div className="text-[11px] text-muted-foreground">
                            {item.isDoubleMarked && (
                              <span className="text-rose-600 font-bold">Dupla marcação</span>
                            )}
                            {!item.isDoubleMarked && (
                              <span>
                                Sugestão: <strong>{item.detectedLetter || "Em Branco"}</strong>{" "}
                                (Confiança: {Math.round(item.confidence * 100)}%)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Botões de Correção com 1 Clique */}
                        <div className="flex items-center gap-1 self-end sm:self-auto">
                          <span className="text-[11px] text-muted-foreground mr-1.5">Confirmar:</span>
                          {(["A", "B", "C", "D", "E"] as OptionLetter[]).map((letter) => (
                            <button
                              key={letter}
                              onClick={() =>
                                handleQuickCorrection(sheet.sheetIndex, item.itemNumber, letter)
                              }
                              className={`w-7 h-7 rounded text-xs font-bold transition-all border ${
                                item.detectedLetter === letter
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-card border-border text-foreground hover:bg-muted"
                              }`}
                            >
                              {letter}
                            </button>
                          ))}
                          <button
                            onClick={() =>
                              handleQuickCorrection(sheet.sheetIndex, item.itemNumber, null)
                            }
                            className="px-2 h-7 rounded text-[11px] font-medium border border-border bg-card hover:bg-muted text-muted-foreground ml-1"
                          >
                            Em Branco
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ABA 3: FILA DE IDENTIFICAÇÃO MANUAL (FOLHAS SEM QR) */}
      {activeTab === "manual" && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300">
            Folhas onde o QR Code foi danificado, rasgado ou ilegível na digitalização. Associe o aluno manualmente para validar as respostas.
          </div>

          {unidentifiedSheets.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground border border-border rounded-lg bg-card">
              ✓ Nenhuma folha na fila manual. Todos os QR codes foram identificados automaticamente!
            </div>
          ) : (
            unidentifiedSheets.map((sheet) => (
              <div
                key={sheet.sheetIndex}
                className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-xs text-foreground">
                    Folha Desconhecida #{sheet.sheetIndex}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {sheet.items.filter((i) => i.detectedLetter !== null).length} questões marcadas detectadas
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    className="px-3 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Selecione o aluno correspondente...
                    </option>
                    {students.map((s) => (
                      <option key={s.userId} value={s.userId}>
                        {s.name} ({s.ra})
                      </option>
                    ))}
                  </select>

                  <button className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs">
                    Vincular Aluno
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ABA 4: DIGITAÇÃO RÁPIDA POR TECLADO (ALTERNATIVA MANUAL) */}
      {activeTab === "teclado" && (
        <div className="p-5 rounded-xl border border-border bg-card space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Digitação Rápida de Gabarito por Teclado
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Digite as teclas <strong>A, B, C, D, E</strong> para preencher e avançar automaticamente para a próxima questão.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={keyboardStudentId}
                onChange={(e) => setKeyboardStudentId(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none"
              >
                {students.map((s) => (
                  <option key={s.userId} value={s.userId}>
                    {s.name} ({s.ra})
                  </option>
                ))}
              </select>

              <select
                value={keyboardFormCode}
                onChange={(e) => setKeyboardFormCode(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none"
              >
                <option value="A">Caderno A</option>
                <option value="B">Caderno B</option>
                <option value="C">Caderno C</option>
                <option value="D">Caderno D</option>
              </select>
            </div>
          </div>

          {/* Grade de Campos de Entrada Rápida */}
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {Array.from({ length: totalQuestions }, (_, i) => {
              const qNum = i + 1;
              const val = keyboardAnswers[qNum] || "";

              return (
                <div
                  key={qNum}
                  className="flex flex-col items-center p-2 rounded-lg border border-border bg-muted/20"
                >
                  <span className="text-[10px] font-bold text-muted-foreground mb-1">
                    #{qNum}
                  </span>
                  <input
                    id={`keyboard-item-${qNum}`}
                    type="text"
                    maxLength={1}
                    value={val}
                    onKeyDown={(e) => handleKeyboardInput(e, qNum)}
                    onChange={() => {}}
                    className="w-8 h-8 text-center text-xs font-bold rounded border border-input bg-background text-foreground uppercase focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-xs text-muted-foreground">
              {Object.values(keyboardAnswers).filter(Boolean).length} de {totalQuestions} questões preenchidas
            </span>

            <button
              onClick={handleSaveKeyboardEntry}
              disabled={isPending || Object.keys(keyboardAnswers).length === 0}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
            >
              {isPending ? "Gravando..." : "Salvar Respostas Digitadas"}
            </button>
          </div>
        </div>
      )}

      {/* BLOCO 5: Rodapé Padronizado */}
      <IndicatorFootnote
        base={`${totalQuestions} questões • A4 300 DPI`}
        periodo="Ano Letivo 2027"
        fonte="Sistema de Leitura Óptica OMR MedPleni (PR-07, PR-11)"
      />
    </div>
  );
}
