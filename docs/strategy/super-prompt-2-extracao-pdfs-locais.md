# SUPER PROMPT 2 (v2) — EXTRAÇÃO DOS PDFs LOCAIS
## Continuação do pipeline MedPleni · Fases 2, 3 e 4
## Para: Sistema Multi-Agente com acesso a arquivos do Mac

---

## O QUE JÁ FOI FEITO (leia antes de começar)

Você (ou um agente anterior desta mesma sessão) executou o pipeline completo nas **4 fases**, mas apenas sobre uma das 18 edições coletadas. O estado atual é:

- ✅ **Fase 1 — Rastreamento:** 18 edições mapeadas, 43 PDFs baixados em `/Users/katiacili/Downloads/MedPleni-Fontes/`
- ✅ **Fase 2 — Extração:** Concluída para ENAMED 2025, Caderno 01 (100 questões)
- ✅ **Fase 3 — Enriquecimento:** Concluída para as 90 questões válidas do ENAMED 2025
- ✅ **Fase 4 — SQL importado:** 90 questões do ENAMED 2025 estão no banco Supabase
- ❌ **17 lotes restantes:** Apenas baixados, não extraídos (~1.600 questões brutas)

**Sua tarefa agora:** executar as Fases 2, 3 e 4 para os 17 lotes restantes, na sequência de prioridade definida abaixo. **Não há nada a baixar da internet.**

---

## CONTEXTO DO PRODUTO

**MedPleni** é um SaaS de preparação para o **ENAMED 2027** (Exame Nacional de Avaliação da Formação Médica, INEP/MEC). A plataforma usa o banco de questões para:
- Diagnóstico Raio-X de lacunas por área DCN
- Banco de questões comentadas com gabarito definitivo
- Simulados cronometrados calibrados pelo estilo real do ENAMED
- Motor de predição de aprovação para 2027

**A persona:** médico brasileiro, 24–32 anos, que estuda muito mas erra o foco. A plataforma resolve isso com precisão cirúrgica.

---

## LIÇÃO APRENDIDA NO PILOTO — TÉCNICA DE EXTRAÇÃO DOS PDFs INEP

> ⚠️ **Leia isto antes de processar qualquer PDF do INEP ou Revalida.**

Os PDFs do INEP têm o **mapa de caracteres da fonte embutida corrompido**. Qualquer extrator convencional (`pdftotext`, PyPDF, PyMuPDF) devolve o texto como cifra de substituição — `"Mulher de 58 anos"` sai como `"Mulheƌ ĚĞ ϱϴ ĂŶŽƐ"`. OCR herda erros em doses, unidades e nomes de fármacos — exatamente onde uma questão médica não pode errar.

**A solução que funcionou no piloto (ENAMED 2025):** reconstruir o mapa de glifos da fonte embutida cruzando três evidências independentes: renderização individual de cada glifo com OCR, votação por alinhamento de linhas inteiras contra OCR de página, e desambiguação por contexto em português. Resultado: **95,9% de recall de palavras** contra OCR independente, com os únicos dois valores baixos sendo questões que cruzam fronteira de página.

**Aplique a mesma técnica em todos os lotes.** Se um PDF não tiver esse problema (PDFs da EBSERH/ENARE podem ser diferentes), extraia normalmente e registre no `batch_metadata.extraction_method`.

---

## LOCALIZAÇÃO DOS ARQUIVOS

Todos os PDFs: **`/Users/katiacili/Downloads/MedPleni-Fontes/`**
Saída dos JSONs e SQLs: **`/Users/katiacili/Downloads/MedPleni-Fontes/banco-questoes/`**

### TABELA COMPLETA — pares caderno + gabarito

#### REVALIDA (INEP) — 14 lotes

| Lote ID | Arquivo do Caderno | Arquivo do Gabarito | Tipo gabarito |
|:---|:---|:---|:---|
| REVALIDA_2026_1_C1 | `revalida-2026-1-caderno-1.pdf` | `revalida-2026-1-gabarito-definitivo-caderno-1.pdf` | **DEFINITIVO** |
| REVALIDA_2026_1_C2 | `revalida-2026-1-caderno-2.pdf` | `revalida-2026-1-gabarito-definitivo-caderno-2.pdf` | **DEFINITIVO** |
| REVALIDA_2025_1 | `revalida-2025-1-objetiva.pdf` | `revalida-2025-1-gabarito-definitivo.pdf` | **DEFINITIVO** |
| REVALIDA_2025_2_C1 | `revalida-2025-2-caderno-1.pdf` | `revalida-2025-2-gabarito-caderno-1.pdf` | Único pós-resultado — ver ⚠️ ALERTA A |
| REVALIDA_2025_2_C2 | `revalida-2025-2-caderno-2.pdf` | `revalida-2025-2-gabarito-caderno-2.pdf` | Único pós-resultado — ver ⚠️ ALERTA A |
| REVALIDA_2024_2 | `revalida-2024-2-objetiva.pdf` | `revalida-2024-2-gabarito-definitivo.pdf` | **DEFINITIVO** |
| REVALIDA_2024_1 | `revalida-2024-1-objetiva.pdf` | `revalida-2024-1-gabarito-definitivo.pdf` | **DEFINITIVO** |
| REVALIDA_2023_2 | `revalida-2023-2-objetiva.pdf` | `revalida-2023-2-gabarito-definitivo.pdf` | **DEFINITIVO** |
| REVALIDA_2023_1 | `revalida-2023-1-objetiva.pdf` | `revalida-2023-1-gabarito-definitivo.pdf` | **DEFINITIVO** |
| REVALIDA_2022_2 | `revalida-2022-2-objetiva.pdf` | `revalida-2022-2-gabarito-pos-recursos.pdf` | Pós-recursos (alterações em azul) |
| REVALIDA_2022_1 | `revalida-2022-1-objetiva.pdf` | `revalida-2022-1-gabarito.pdf` | Único — ver ⚠️ ALERTA C |
| REVALIDA_2021 | `revalida-2021-objetiva.pdf` | `revalida-2021-gabarito-definitivo.pdf` | **DEFINITIVO** |
| REVALIDA_2020_1 | `revalida-2020-objetiva-1.pdf` | `revalida-2020-gabarito-caderno-1.pdf` | Único — ver ⚠️ ALERTA C |
| REVALIDA_2020_2 | `revalida-2020-objetiva-2.pdf` | `revalida-2020-gabarito-caderno-2.pdf` | Único — ver ⚠️ ALERTA C |

#### ENARE (EBSERH) — 5 edições com prova própria

> **Nota de banca:** ENARE 2020/2021 a 2023/2024 = **Instituto AOCP** (não FGV). ENARE 2024/2025 = **FGV**. A partir de 2025/2026 o ENARE não aplica mais prova própria — usa o ENAMED. Portanto, `ENARE_2024_2025` é a **última edição com prova própria ENARE.**

| Lote ID | Arquivo do Caderno | Arquivo do Gabarito | Tipo gabarito |
|:---|:---|:---|:---|
| ENARE_2024_2025 | `enare-2024-2025-acesso-direto-tipo-1.pdf` | `enare-2024-2025-gabarito-definitivo-medica.pdf` | **DEFINITIVO** (FGV) |
| ENARE_2023_2024 | `enare-2023-2024-acesso-direto-t361-tipo-1.pdf` | `enare-2023-2024-gabarito.pdf` | Sem rótulo — ver ⚠️ ALERTA C |
| ENARE_2022_2023 | `enare-2022-2023-acesso-direto-t361-tipo-1.pdf` | `enare-2022-2023-gabaritos-medicos.pdf` | Sem rótulo — ver ⚠️ ALERTA C |
| ENARE_2021_2022 | `enare-2021-2022-acesso-direto-t102.pdf` | `enare-2021-2022-gabarito-definitivo.pdf` | **DEFINITIVO** |
| ENARE_2020_2021 | `enare-2020-2021-acesso-direto-m209.pdf` | `enare-2020-2021-gabarito-pos-recursos.pdf` | Pós-recursos |

---

## ALERTAS OBRIGATÓRIOS

### ⚠️ ALERTA A — Revalida 2025/2: sobreposição confirmada com ENAMED 2025
A nota oficial do INEP (`nota-gabarito-enamed-revalida-2025.pdf`) confirma que ENAMED 2025 e Revalida 2025/2 foram aplicados no mesmo dia (19/10/2025) e têm questões em comum. No piloto do ENAMED 2025, você mapeou que Q10=Q60, Q2=Q52, Q40=Q90 entre Cadernos 1 e 2 — use essa mesma técnica de validação cruzada por texto para identificar a sobreposição entre Revalida 2025/2 e ENAMED 2025.

**Protocolo obrigatório:**
1. Antes de extrair qualquer questão do REVALIDA_2025_2, compare os enunciados com os do ENAMED 2025 (JSON disponível em `banco-questoes/questions_batch_enamed2025_2026-08-30.json`).
2. Questões com primeiros 80 caracteres idênticos = duplicata. Marque `status: "duplicata_enamed2025"`.
3. Extraia e inclua **apenas as questões exclusivas** do Revalida 2025/2.
4. Registre no `batch_metadata.notes` quantas foram excluídas por sobreposição.

### ⚠️ ALERTA B — ENARE 2022/2023 e 2023/2024: apenas Tipo 1 disponível
Esses lotes têm 4 tipos de caderno (embaralhamentos distintos das mesmas questões). Apenas o Tipo 1 foi baixado.

**Protocolo:**
- Extraia as questões do Tipo 1.
- Identifique no gabarito a coluna/seção correspondente ao Tipo 1.
- Registre em `batch_metadata.notes`: `"Apenas Tipo 1 de 4 processado. Tipos 2, 3, 4 são o mesmo conjunto com alternativas embaralhadas — não processar separadamente sem validação cruzada."`

### ⚠️ ALERTA C — Gabaritos sem rótulo "definitivo"
Para REVALIDA_2020 (ambos os cadernos), REVALIDA_2022_1, ENARE_2022_2023, ENARE_2023_2024:

**Protocolo:**
1. Leia o cabeçalho INTERNO do PDF do gabarito.
2. Contém "DEFINITIVO", "GABARITO DEFINITIVO" ou "PÓS-RECURSOS" → `gabarito_source: "gabarito_definitivo"` → prossiga normalmente.
3. Contém apenas "PRELIMINAR" → **PARE para este lote.** Registre `gabarito_source: "gabarito_preliminar_apenas"`. Marque todas as questões com `status: "gabarito_preliminar_pendente"`. Avance para o próximo lote.
4. Ambíguo (nenhum rótulo) → `gabarito_source: "gabarito_unico_sem_rotulo"` → prossiga com cautela e registre no `observacoes` de cada questão.

---

## PROTOCOLO DE SEGURANÇA ANTI-ALUCINAÇÃO (INVIOLÁVEL)

1. **Fonte comprovada ou não existe.** Nunca invente, infira ou reconstrua uma questão a partir de memória. O enunciado e as alternativas saem do PDF ou não saem.
2. **Gabarito sagrado.** Só gabarito definitivo. Nunca inferir a resposta correta pelo raciocínio clínico.
3. **Extração literal.** Não reformule, não melhore o português. Corrija apenas caracteres de OCR/glifo corrompidos (documentar em `observacoes`).
4. **IA só nos metadados.** `explanation`, `tags`, `difficulty`, `diretriz_referencia` podem ser gerados pela IA (`ia_generated: true`). Enunciado, alternativas e gabarito são sagrados.
5. **Dúvida = conservadorismo.** Área ambígua → mais abrangente. Dificuldade ambígua → `"media"`. Gabarito não encontrado → `"NAO_ENCONTRADO"`.
6. **Deduplicação.** Antes de incluir qualquer questão: checar primeiros 80 caracteres do enunciado + ano + instituição. Duplicata → `status: "duplicata_ignorada"`.
7. **Diretrizes reais.** A explicação deve citar uma diretriz médica que realmente existe. Proibido inventar número de portaria. Na dúvida: citar a diretriz sem número ou marcar explicitamente "sem diretriz específica identificada com segurança".

---

## CLASSIFICAÇÃO DE ÁREA — 7 ÁREAS OFICIAIS (Portaria INEP 478/2025)

Use **exatamente** estes 7 valores, com acentuação exata:

| Área (valor exato no JSON) | Código | % real ENAMED 2025 |
|:---|:---|:---|
| `Clínica Médica` | CM | 23.3% |
| `Ginecologia e Obstetrícia` | GO | 16.7% |
| `Pediatria` | Ped | 15.6% |
| `Medicina de Família e Comunidade` | MFC | 14.4% |
| `Cirurgia Geral` | CG | 12.2% |
| `Saúde Coletiva` | SC | 10.0% |
| `Saúde Mental` | SM | 7.8% |

**Importante — subareas que NÃO são áreas:**
- `Psiquiatria` = subárea de **Saúde Mental**
- `Urgência e Emergência` = subárea de Clínica Médica ou Cirurgia Geral (conforme tema)
- `Atenção Primária` / `SUS` = subárea de MFC ou Saúde Coletiva

Sempre preencha `subarea` com a especialidade específica (ex: `"Cardiologia — Insuficiência Cardíaca"`, `"MFC — Visita Domiciliar"`, `"Saúde Mental — Esquizofrenia"`).

---

## ESQUEMA JSON DE SAÍDA

```json
{
  "batch_metadata": {
    "agent_version": "2.0",
    "lote_id": "REVALIDA_2026_1_C1",
    "source_name": "Revalida 2026/1 — Caderno 1",
    "source_file": "revalida-2026-1-caderno-1.pdf",
    "gabarito_file": "revalida-2026-1-gabarito-definitivo-caderno-1.pdf",
    "gabarito_source_type": "gabarito_definitivo",
    "extraction_method": "remapeamento_glifos_fonte_embutida",
    "collection_date": "YYYY-MM-DD",
    "enamed_alignment": "alto",
    "total_questions_found": 0,
    "total_questions_valid": 0,
    "total_questions_discarded": 0,
    "distribuicao_areas_7": {
      "Clínica Médica": 0,
      "Ginecologia e Obstetrícia": 0,
      "Pediatria": 0,
      "Medicina de Família e Comunidade": 0,
      "Cirurgia Geral": 0,
      "Saúde Coletiva": 0,
      "Saúde Mental": 0
    },
    "notes": ""
  },
  "questions": [
    {
      "code": "REVALIDA_2026_1_C1_Q001",
      "status": "valida",
      "source_file": "revalida-2026-1-caderno-1.pdf",
      "source_page": 5,
      "gabarito_source": "gabarito_definitivo",
      "gabarito_file": "revalida-2026-1-gabarito-definitivo-caderno-1.pdf",
      "statement": "Texto literal exato extraído do PDF...",
      "clinical_context": null,
      "has_figure": false,
      "options": [
        { "letter": "A", "text": "Texto literal", "is_correct": false },
        { "letter": "B", "text": "Texto literal", "is_correct": true },
        { "letter": "C", "text": "Texto literal", "is_correct": false },
        { "letter": "D", "text": "Texto literal", "is_correct": false }
      ],
      "correct_option": "B",
      "institution": "REVALIDA",
      "year": 2026,
      "area": "Clínica Médica",
      "area_rollup_5": "Clínica Médica",
      "subarea": "Cardiologia — Insuficiência Cardíaca com FE Reduzida",
      "difficulty": "media",
      "ia_generated": true,
      "explanation": "Justificativa clínica de 200-400 palavras. Explica a correta. Desmonta cada distrator com raciocínio clínico real...",
      "diretriz_referencia": "Diretriz Brasileira de Insuficiência Cardíaca — SBC",
      "tags": ["insuficiência cardíaca", "BNP", "espironolactona", "ICFEr"],
      "dcn_competency": "Atenção à Saúde — Cuidado individual",
      "enamed_alignment": "alto",
      "observacoes": null
    }
  ]
}
```

### Valores válidos por campo
- **`institution`**: `"REVALIDA"` ou `"ENARE"`
- **`area`**: exatamente uma das 7 listadas acima (com acentuação exata)
- **`area_rollup_5`**: agregação em 5 grupos para compatibilidade de tela — MFC e Saúde Mental → `"Saúde Coletiva"`
- **`difficulty`**: `"facil"` | `"media"` | `"alta"` | `"muito-alta"`
- **`status`**: `"valida"` | `"anulada"` | `"gabarito_preliminar_pendente"` | `"duplicata_enamed2025"` | `"duplicata_ignorada"` | `"figura_obrigatoria_indisponivel"`
- **`enamed_alignment`**: `"alto"` (Revalida 2023–2026, ENARE 2024/2025) | `"medio"` (Revalida 2020–2022) | `"baixo"` (ENARE 2020–2023, estilo R1 clássico)
- **`extraction_method`**: `"remapeamento_glifos_fonte_embutida"` | `"extracao_direta_sem_problema_de_glifo"` | `"ocr_fallback"`

---

## FORMATO SQL DE SAÍDA

Para cada lote, gere um arquivo SQL. Use este formato exato (compatível com o import já feito para o ENAMED 2025):

```sql
-- MedPleni · Import [LOTE_ID]
BEGIN;

INSERT INTO public.questions (code, statement, clinical_context, institution, year, area, subarea, difficulty, explanation, tags)
VALUES (
  'REVALIDA_2026_1_C1_Q001',
  'Texto literal do enunciado...',
  NULL,
  'REVALIDA',
  2026,
  'Clínica Médica',
  'Cardiologia — Insuficiência Cardíaca',
  'media',
  'Explicação pedagógica...',
  ARRAY['insuficiência cardíaca','BNP','espironolactona']
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.question_options (question_id, letter, text, is_correct)
SELECT id, 'A', 'texto alternativa A', false
FROM public.questions WHERE code = 'REVALIDA_2026_1_C1_Q001'
ON CONFLICT (question_id, letter) DO NOTHING;

-- repetir para B, C, D (e E se o lote tiver 5 alternativas)

COMMIT;
```

> **Nota sobre aspas simples:** use `''` (duas aspas simples) para escapar apóstrofes no texto. Ex: `'d''água'`.

---

## SEQUÊNCIA DE EXECUÇÃO

Execute **nesta ordem**, sem parar para aprovação entre lotes:

```
BLOCO 1 — Revalida (INEP, alto alinhamento com ENAMED):
  1. REVALIDA_2026_1_C1
  2. REVALIDA_2026_1_C2  → verificar duplicatas entre C1 e C2 antes de incluir
  3. REVALIDA_2025_1
  4. REVALIDA_2025_2_C1  → ⚠️ ALERTA A (verificar sobreposição com ENAMED 2025 ANTES)
  5. REVALIDA_2025_2_C2  → ⚠️ ALERTA A
  6. REVALIDA_2024_2
  7. REVALIDA_2024_1
  8. REVALIDA_2023_2
  9. REVALIDA_2023_1
  10. REVALIDA_2022_2
  11. REVALIDA_2022_1  → ⚠️ ALERTA C (verificar cabeçalho do gabarito)
  12. REVALIDA_2021
  13. REVALIDA_2020_1  → ⚠️ ALERTA C
  14. REVALIDA_2020_2  → ⚠️ ALERTA C

BLOCO 2 — ENARE (estilo progressivamente menos alinhado ao ENAMED):
  15. ENARE_2024_2025  (FGV — mais alinhado)
  16. ENARE_2023_2024  → ⚠️ ALERTAS B + C
  17. ENARE_2022_2023  → ⚠️ ALERTAS B + C
  18. ENARE_2021_2022
  19. ENARE_2020_2021
```

---

## RELATÓRIO CONSOLIDADO FINAL

Ao terminar todos os lotes, gere `audit_report_lotes_[data].md` com:

1. **Tabela de resultado por lote:** questões encontradas / válidas / descartadas / motivo dos descartes
2. **Cobertura vs. meta** (usar tabela abaixo como referência):

| Área | No banco antes | Meta ideal | A atingir |
|:---|:---|:---|:---|
| Clínica Médica | 21 | 700 | 679 |
| Ginecologia e Obstetrícia | 15 | 500 | 485 |
| Pediatria | 14 | 470 | 456 |
| Medicina de Família e Comunidade | 13 | 430 | 417 |
| Cirurgia Geral | 11 | 365 | 354 |
| Saúde Coletiva | 9 | 300 | 291 |
| Saúde Mental | 7 | 235 | 228 |
| **TOTAL** | **90** | **3.000** | **2.910** |

3. **Duplicatas encontradas** com detalhe de qual lote × qual questão já existia
4. **Alertas de qualidade** (OCR problemático, gabaritos ambíguos, figuras não processadas)
5. **Recomendação de próximo passo** (fontes secundárias: AMRIGS, SUS-SP, UERJ, USP, UNIFESP — não fazem parte deste escopo, aguardam decisão)

---

## INSTRUÇÃO FINAL

Você tem 43 PDFs oficiais em `/Users/katiacili/Downloads/MedPleni-Fontes/`. A rede não é necessária.

Comece pelo **REVALIDA_2026_1_C1**. Para cada lote:
1. Leia o par caderno + gabarito
2. Verifique tipo do gabarito pelo cabeçalho interno
3. Aplique a técnica de remapeamento de glifos (igual ao ENAMED 2025)
4. Extraia literalmente
5. Case com o gabarito
6. Enriqueça (explicação + tags + dificuldade)
7. Gere JSON + SQL em `banco-questoes/`
8. Reporte: "Lote X concluído: N válidas, N descartadas"
9. Avance imediatamente para o próximo

**Só pare se encontrar situação não coberta por este protocolo.** Reporte o progresso a cada lote.
