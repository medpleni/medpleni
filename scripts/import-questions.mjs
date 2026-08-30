#!/usr/bin/env node
/**
 * MedPleni — Script de Importação de Questões para o Supabase
 * Lê o questions_batch JSON gerado pelo pipeline de coleta e faz
 * batch insert nas tabelas `questions` e `question_options`.
 *
 * Uso: node import-questions.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";

// Carrega variáveis do .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../platform/.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??   // preferencial (bypassa RLS)
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;  // fallback (requer RLS desativado em questions)

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌  NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_ANON_KEY não definidos em .env.local");
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("⚠️  Usando ANON KEY (não a service role). Se o RLS bloquear o insert, adicione SUPABASE_SERVICE_ROLE_KEY no .env.local.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ── Carrega o JSON ──────────────────────────────────────────────────────────
const BATCH_FILE = path.resolve(
  "/Users/katiacili/Downloads/MedPleni-Fontes/banco-questoes/questions_batch_enamed2025_2026-08-30.json"
);

const raw = JSON.parse(readFileSync(BATCH_FILE, "utf-8"));
const { batch_metadata, questions } = raw;

console.log("\n══════════════════════════════════════════════════════");
console.log("  MedPleni · Importador de Questões → Supabase");
console.log("══════════════════════════════════════════════════════");
console.log(`📦  Lote: ${batch_metadata.source_name}`);
console.log(`📅  Coletado em: ${batch_metadata.collection_date}`);
console.log(`📊  Total no JSON: ${questions.length} questões`);
console.log();

// ── Filtra apenas válidas ──────────────────────────────────────────────────
const validas = questions.filter((q) => q.status === "valida");
const descartadas = questions.filter((q) => q.status !== "valida");

console.log(`✅  Válidas para importar: ${validas.length}`);
console.log(`⏭️   Descartadas (anuladas/excluídas): ${descartadas.length}`);
console.log();

// ── Mapeia campos do JSON para o schema do banco ──────────────────────────
function mapQuestion(q) {
  return {
    code: q.code,
    statement: q.statement,
    clinical_context: q.clinical_context ?? null,
    institution: q.institution,
    year: q.year,
    area: q.area_rollup_5 ?? q.area,          // usa rollup de 5 para compatibilidade
    subarea: q.subarea,
    difficulty: q.difficulty,
    explanation: q.explanation,
    tags: q.tags ?? [],
  };
}

function mapOptions(q) {
  return q.options.map((opt) => ({
    question_id: null, // preenchido após insert da questão
    letter: opt.letter,
    text: opt.text,
    is_correct: opt.is_correct,
  }));
}

// ── Estatísticas de resultado ─────────────────────────────────────────────
let inserted = 0;
let skipped = 0;
let errors = 0;
const errorLog = [];

// ── Loop de importação (serial para respeitar rate limits) ────────────────
console.log("🚀  Iniciando importação...\n");

for (const q of validas) {
  const questionRow = mapQuestion(q);

  // Tenta inserir a questão (ignora duplicata por code)
  const { data: insertedQ, error: qErr } = await supabase
    .from("questions")
    .insert(questionRow)
    .select("id")
    .single();

  if (qErr) {
    if (qErr.code === "23505") {
      // Unique violation — já existe no banco
      console.log(`  ⏭️  Pulada (já existe): ${q.code}`);
      skipped++;
      continue;
    }
    console.error(`  ❌  Erro ao inserir ${q.code}: ${qErr.message}`);
    errors++;
    errorLog.push({ code: q.code, error: qErr.message });
    continue;
  }

  // Insere as alternativas
  const options = mapOptions(q).map((opt) => ({
    ...opt,
    question_id: insertedQ.id,
  }));

  const { error: optErr } = await supabase
    .from("question_options")
    .insert(options);

  if (optErr) {
    console.error(`  ❌  Erro nas alternativas de ${q.code}: ${optErr.message}`);
    errors++;
    errorLog.push({ code: q.code, error: `alternativas: ${optErr.message}` });
    // Rollback da questão
    await supabase.from("questions").delete().eq("id", insertedQ.id);
    continue;
  }

  console.log(`  ✅  Importada: ${q.code} — ${q.area_rollup_5 ?? q.area} · ${q.difficulty}`);
  inserted++;
}

// ── Relatório final ───────────────────────────────────────────────────────
console.log("\n══════════════════════════════════════════════════════");
console.log("  Resultado da Importação");
console.log("══════════════════════════════════════════════════════");
console.log(`✅  Inseridas com sucesso : ${inserted}`);
console.log(`⏭️   Puladas (já existiam) : ${skipped}`);
console.log(`❌  Erros                 : ${errors}`);

if (errorLog.length > 0) {
  console.log("\n⚠️  Log de erros:");
  errorLog.forEach((e) => console.log(`    • ${e.code}: ${e.error}`));
}

// ── Distribuição por área ─────────────────────────────────────────────────
const dist = {};
validas.forEach((q) => {
  const area = q.area_rollup_5 ?? q.area;
  dist[area] = (dist[area] ?? 0) + 1;
});

console.log("\n📊  Distribuição por área:");
Object.entries(dist)
  .sort(([, a], [, b]) => b - a)
  .forEach(([area, count]) => {
    const pct = ((count / validas.length) * 100).toFixed(1);
    console.log(`    ${area.padEnd(35)} ${String(count).padStart(3)} (${pct}%)`);
  });

console.log("\n🏁  Importação concluída.");
