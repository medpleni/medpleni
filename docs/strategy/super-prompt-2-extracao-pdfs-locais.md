# SUPER PROMPT 2 — EXTRAÇÃO DE QUESTÕES DOS PDFs LOCAIS
## Para: Sistema Multi-Agente com capacidade de leitura de PDF
## Projeto: MedPleni · Pipeline de Ingestão — Fases 2, 3 e 4

---

## CONTEXTO ESSENCIAL

Você é a continuação de um pipeline de coleta de questões médicas para a plataforma **MedPleni**, um SaaS de preparação para o **ENAMED 2027** (Exame Nacional de Avaliação da Formação Médica, realizado pelo INEP/MEC).

A **Fase 1 já foi concluída** por um agente anterior: 43 PDFs oficiais foram baixados e estão disponíveis localmente no Mac do usuário. Sua tarefa é executar as **Fases 2, 3 e 4** — extração, enriquecimento pedagógico e geração do SQL de importação. **Não há nada a baixar da internet.**

### O banco de questões atual

O ENAMED 2025 já foi processado e importado: **90 questões válidas** estão no banco Supabase. Seu trabalho é processar os **17 lotes restantes** (~1.600 questões brutas estimadas).

---

## LOCALIZAÇÃO DOS ARQUIVOS

Todos os PDFs estão em: **`/Users/katiacili/Downloads/MedPleni-Fontes/`**

### TABELA COMPLETA DE PARES — caderno + gabarito

#### REVALIDA (INEP) — 11 edições

| Lote | Arquivo do Caderno | Arquivo do Gabarito | Tipo gabarito |
|:---|:---|:---|:---|
| REVALIDA_2020_1 | `revalida-2020-objetiva-1.pdf` | `revalida-2020-gabarito-caderno-1.pdf` | Único publicado — verificar cabeçalho |
| REVALIDA_2020_2 | `revalida-2020-objetiva-2.pdf` | `revalida-2020-gabarito-caderno-2.pdf` | Único publicado — verificar cabeçalho |
| REVALIDA_2021 | `revalida-2021-objetiva.pdf` | `revalida-2021-gabarito-definitivo.pdf` | **DEFINITIVO** (título interno confirmado) |
| REVALIDA_2022_1 | `revalida-2022-1-objetiva.pdf` | `revalida-2022-1-gabarito.pdf` | Único publicado — verificar cabeçalho |
| REVALIDA_2022_2 | `revalida-2022-2-objetiva.pdf` | `revalida-2022-2-gabarito-pos-recursos.pdf` | Pós-recursos (alterações em azul) |
| REVALIDA_2023_1 | `revalida-2023-1-objetiva.pdf` | `revalida-2023-1-gabarito-definitivo.pdf` | **DEFINITIVO** |
| REVALIDA_2023_2 | `revalida-2023-2-objetiva.pdf` | `revalida-2023-2-gabarito-definitivo.pdf` | **DEFINITIVO** |
| REVALIDA_2024_1 | `revalida-2024-1-objetiva.pdf` | `revalida-2024-1-gabarito-definitivo.pdf` | **DEFINITIVO** |
| REVALIDA_2024_2 | `revalida-2024-2-objetiva.pdf` | `revalida-2024-2-gabarito-definitivo.pdf` | **DEFINITIVO** |
| REVALIDA_2025_1 | `revalida-2025-1-objetiva.pdf` | `revalida-2025-1-gabarito-definitivo.pdf` | **DEFINITIVO** |
| REVALIDA_2025_2_C1 | `revalida-2025-2-caderno-1.pdf` | `revalida-2025-2-gabarito-caderno-1.pdf` | Único publicado pós-resultado |
| REVALIDA_2025_2_C2 | `revalida-2025-2-caderno-2.pdf` | `revalida-2025-2-gabarito-caderno-2.pdf` | Único publicado pós-resultado |
| REVALIDA_2026_1_C1 | `revalida-2026-1-caderno-1.pdf` | `revalida-2026-1-gabarito-definitivo-caderno-1.pdf` | **DEFINITIVO** |
| REVALIDA_2026_1_C2 | `revalida-2026-1-caderno-2.pdf` | `revalida-2026-1-gabarito-definitivo-caderno-2.pdf` | **DEFINITIVO** |

#### ENARE (EBSERH) — 5 edições com prova própria

| Lote | Arquivo do Caderno | Arquivo do Gabarito | Tipo gabarito |
|:---|:---|:---|:---|
| ENARE_2020_2021 | `enare-2020-2021-acesso-direto-m209.pdf` | `enare-2020-2021-gabarito-pos-recursos.pdf` | Pós-recursos |
| ENARE_2021_2022 | `enare-2021-2022-acesso-direto-t102.pdf` | `enare-2021-2022-gabarito-definitivo.pdf` | **DEFINITIVO** |
| ENARE_2022_2023 | `enare-2022-2023-acesso-direto-t361-tipo-1.pdf` | `enare-2022-2023-gabaritos-medicos.pdf` | Sem rótulo — verificar cabeçalho |
| ENARE_2023_2024 | `enare-2023-2024-acesso-direto-t361-tipo-1.pdf` | `enare-2023-2024-gabarito.pdf` | Sem rótulo — verificar cabeçalho |
| ENARE_2024_2025 | `enare-2024-2025-acesso-direto-tipo-1.pdf` | `enare-2024-2025-gabarito-definitivo-medica.pdf` | **DEFINITIVO** (FGV) |

#### Documento auxiliar
- `nota-gabarito-enamed-revalida-2025.pdf` — Nota oficial do INEP sobre questões anuladas do ENAMED/Revalida 2025. Consultar ao processar REVALIDA_2025_2.

---

## ALERTAS CRÍTICOS POR LOTE

> Leia estes alertas ANTES de processar cada lote correspondente.

### ⚠️ ALERTA 1 — Revalida 2025/2: suspeita de sobreposição com ENAMED 2025
A nota oficial do INEP (`nota-gabarito-enamed-revalida-2025.pdf`) afirma que o ENAMED 2025 e o Revalida 2025/2 foram aplicados no **mesmo dia (19/10/2025)** e que os cadernos **"apresentam questões em comum"**. Quantas questões são compartilhadas não está explicitado.

**Protocolo obrigatório para REVALIDA_2025_2:**
1. Compare os enunciados do Revalida 2025/2 com os do ENAMED 2025 (já no banco).
2. Antes de extrair qualquer questão, identifique as sobreposições pelos primeiros 80 caracteres do enunciado.
3. Questões idênticas ao ENAMED 2025: marque `status: "duplicata_enamed2025"` e descarte.
4. Processe e inclua apenas as questões **exclusivas** do Revalida 2025/2.

### ⚠️ ALERTA 2 — ENARE 2022/2023 e 2023/2024: apenas o Tipo 1 está disponível
Os cadernos do ENARE 2022/2023 e 2023/2024 têm 4 tipos (embaralhamentos). Apenas o Tipo 1 foi baixado. O gabarito, porém, abrange todos os tipos.

**Protocolo obrigatório:**
1. Extraia as questões apenas do Tipo 1.
2. No gabarito, identifique a seção/coluna correspondente ao Tipo 1.
3. Marque no `batch_metadata.notes`: `"Apenas Tipo 1 de 4 processado. Tipos 2, 3 e 4 têm questões na mesma ordem com alternativas embaralhadas — não coletar como lotes separados sem validação cruzada."`

### ⚠️ ALERTA 3 — Gabaritos sem rótulo "definitivo"
Para REVALIDA_2020 (cad. 1 e 2), REVALIDA_2022_1, ENARE_2022_2023 e ENARE_2023_2024, o gabarito não tem rótulo claro no nome do arquivo.

**Protocolo:** Leia o cabeçalho interno do PDF do gabarito.
- Se contiver "DEFINITIVO", "GABARITO DEFINITIVO" ou "PÓS-RECURSOS": registre `gabarito_source: "gabarito_definitivo"`.
- Se contiver apenas "PRELIMINAR": **PARE** — não use este gabarito. Registre `gabarito_source: "gabarito_preliminar_apenas"` e marque todas as questões do lote com `status: "gabarito_preliminar_pendente"`.
- Se ambíguo: registre `gabarito_source: "gabarito_unico_sem_rotulo"` e prossiga com cautela.

### ⚠️ ALERTA 4 — Revalida 2020 (dois cadernos)
O Revalida 2020 tem dois cadernos objetivos (objetiva-1 e objetiva-2) — ao contrário das edições posteriores que têm apenas um. Cada caderno deve ser processado como lote separado com codes `REVALIDA_2020_1_QNNN` e `REVALIDA_2020_2_QNNN`.

### ⚠️ ALERTA 5 — ENARE: estilo de prova diferente do ENAMED
As edições ENARE 2020/2021 a 2023/2024 são provas de residência tradicionais (estilo R1), com distribuição de áreas diferente do ENAMED. Extraia normalmente, mas adicione o campo `enamed_alignment: "baixo"` no `batch_metadata`. Isso vai ajudar no futuro a filtrar questões por alinhamento ao estilo ENAMED versus estilo R1.

---

## SEQUÊNCIA DE EXECUÇÃO

Processe os lotes **nesta ordem de prioridade** (maior alinhamento com ENAMED primeiro):

```
PRIORIDADE 1 — Máximo alinhamento com ENAMED (mesma banca INEP):
  1. REVALIDA_2026_1_C1 + C2  (2026 — mais recente)
  2. REVALIDA_2025_1           (2025 — mesma época do ENAMED 2025)
  3. REVALIDA_2025_2_C1        (⚠️ ALERTA 1 — verificar sobreposição antes)
  4. REVALIDA_2024_2
  5. REVALIDA_2024_1
  6. REVALIDA_2023_2
  7. REVALIDA_2023_1
  8. REVALIDA_2022_2
  9. REVALIDA_2022_1
  10. REVALIDA_2021
  11. REVALIDA_2020_1 + REVALIDA_2020_2

PRIORIDADE 2 — ENARE (FGV → mais alinhado ao ENAMED):
  12. ENARE_2024_2025 (FGV — última com prova própria)
  13. ENARE_2023_2024 (⚠️ ALERTA 2 e 3)
  14. ENARE_2022_2023 (⚠️ ALERTA 2 e 3)
  15. ENARE_2021_2022
  16. ENARE_2020_2021
```

---

## PROTOCOLO DE SEGURANÇA ANTI-ALUCINAÇÃO (INVIOLÁVEL)

1. **Extração literal**: enunciado e alternativas saem do PDF exatamente como estão. Sem reformulação, sem "melhoria" de português.
2. **Gabarito sagrado**: só usar gabarito definitivo. Nunca inferir a resposta correta pelo raciocínio clínico.
3. **IA só nos metadados**: `explanation`, `tags`, `difficulty`, `diretriz_referencia` podem ser gerados pela IA (sinalizar `ia_generated: true`). Enunciado, alternativas e gabarito são sagrados.
4. **Dúvida = conservadorismo**: área ambígua → usar a mais abrangente. Dificuldade ambígua → `"media"`. Gabarito não encontrado → `"NAO_ENCONTRADO"`.
5. **Duplicatas**: checar primeiros 80 caracteres do enunciado + ano + instituição antes de incluir qualquer questão.

---

## MATRIZ DCN OFICIAL — 7 ÁREAS (Portaria INEP 478/2025)

Classifique cada questão em uma destas 7 áreas exatas:

| Área | Código curto | Distribuição real ENAMED 2025 |
|:---|:---|:---|
| `Clínica Médica` | CM | 23.3% |
| `Ginecologia e Obstetrícia` | GO | 16.7% |
| `Pediatria` | Ped | 15.6% |
| `Medicina de Família e Comunidade` | MFC | 14.4% |
| `Cirurgia Geral` | CG | 12.2% |
| `Saúde Coletiva` | SC | 10.0% |
| `Saúde Mental` | SM | 7.8% |

> **Importante:** "Psiquiatria" é subárea de `Saúde Mental`. "Urgência e Emergência" é subárea de `Clínica Médica` ou `Cirurgia Geral` conforme o tema. "Atenção Primária" e "SUS" são subáreas de `Medicina de Família e Comunidade` ou `Saúde Coletiva`.

---

## ESQUEMA DE DADOS DE SAÍDA (JSON)

Cada lote deve gerar um arquivo JSON com este schema:

```json
{
  "batch_metadata": {
    "agent_version": "2.0",
    "lote_id": "REVALIDA_2026_1_C1",
    "source_name": "Revalida 2026/1 — Caderno 1",
    "source_file": "revalida-2026-1-caderno-1.pdf",
    "gabarito_file": "revalida-2026-1-gabarito-definitivo-caderno-1.pdf",
    "gabarito_source_type": "gabarito_definitivo",
    "collection_date": "[data de hoje]",
    "enamed_alignment": "alto",
    "total_questions_found": 0,
    "total_questions_valid": 0,
    "total_questions_discarded": 0,
    "distribuicao_areas_7": {},
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
      "statement": "Texto literal completo do enunciado extraído do PDF...",
      "clinical_context": null,
      "has_figure": false,
      "options": [
        { "letter": "A", "text": "Texto literal da alternativa A", "is_correct": false },
        { "letter": "B", "text": "Texto literal da alternativa B", "is_correct": true },
        { "letter": "C", "text": "Texto literal da alternativa C", "is_correct": false },
        { "letter": "D", "text": "Texto literal da alternativa D", "is_correct": false }
      ],
      "correct_option": "B",
      "institution": "REVALIDA",
      "year": 2026,
      "area": "Clínica Médica",
      "area_rollup_5": "Clínica Médica",
      "subarea": "Cardiologia — Insuficiência Cardíaca",
      "difficulty": "media",
      "ia_generated": true,
      "explanation": "Justificativa clínica completa de 200 a 400 palavras...",
      "diretriz_referencia": "Diretriz Brasileira de IC — SBC",
      "tags": ["insuficiência cardíaca", "BNP", "espironolactona"],
      "dcn_competency": "Atenção à Saúde — Cuidado individual",
      "enamed_alignment": "alto",
      "observacoes": null
    }
  ]
}
```

### Valores válidos
- **`institution`**: `"REVALIDA"` ou `"ENARE"`
- **`area`**: exatamente uma das 7 listadas acima (ortografia exata com acentos)
- **`difficulty`**: `"facil"` | `"media"` | `"alta"` | `"muito-alta"`
- **`status`**: `"valida"` | `"anulada"` | `"gabarito_preliminar_pendente"` | `"duplicata_enamed2025"` | `"duplicata_ignorada"` | `"figura_obrigatoria_indisponivel"`
- **`enamed_alignment`**: `"alto"` (Revalida 2023–2026 e ENARE 2024/2025) | `"medio"` (Revalida 2020–2022) | `"baixo"` (ENARE 2020–2023)

---

## SAÍDA ESPERADA

Para cada lote processado, gere dois arquivos:

### 1. JSON do lote
**Nome**: `questions_batch_[LOTE_ID]_[data].json`
**Destino**: salve em `/Users/katiacili/Downloads/MedPleni-Fontes/banco-questoes/`

### 2. SQL de importação do lote
**Nome**: `import_[LOTE_ID]_[data].sql`
**Destino**: salve em `/Users/katiacili/Downloads/MedPleni-Fontes/banco-questoes/`

O SQL deve ter este formato para cada questão:
```sql
INSERT INTO public.questions (code, statement, clinical_context, institution, year, area, subarea, difficulty, explanation, tags)
VALUES ('REVALIDA_2026_1_C1_Q001', 'texto...', NULL, 'REVALIDA', 2026, 'Clínica Médica', 'Cardiologia', 'media', 'explicação...', ARRAY['tag1','tag2'])
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.question_options (question_id, letter, text, is_correct)
SELECT id, 'A', 'texto alternativa A', false FROM public.questions WHERE code = 'REVALIDA_2026_1_C1_Q001'
ON CONFLICT (question_id, letter) DO NOTHING;
-- repetir para B, C, D (e E se houver)
```

### 3. Relatório de auditoria consolidado
**Nome**: `audit_report_lotes_[data].md`
Ao final de TODOS os lotes, gere um único relatório com:
- Questões processadas por lote
- Distribuição total por área (comparar com meta 7 áreas)
- Duplicatas encontradas com ENAMED 2025
- Alertas de qualidade por lote
- Cobertura vs. meta de 3.000 questões

---

## METAS DE COBERTURA

| Grande Área | Meta Ideal | Já no banco | Faltam |
|:---|:---|:---|:---|
| Clínica Médica | 699 | 21 | 678 |
| Ginecologia e Obstetrícia | 501 | 15 | 486 |
| Pediatria | 468 | 14 | 454 |
| Medicina de Família e Comunidade | 432 | 13 | 419 |
| Cirurgia Geral | 366 | 11 | 355 |
| Saúde Coletiva | 300 | 9 | 291 |
| Saúde Mental | 234 | 7 | 227 |
| **TOTAL** | **3.000** | **90** | **2.910** |

---

## INSTRUÇÃO FINAL

Você tem acesso a 43 PDFs oficiais em `/Users/katiacili/Downloads/MedPleni-Fontes/`. Não há nada a baixar da internet. A rede não é necessária.

**Comece pelo lote REVALIDA_2026_1_C1** (o mais recente e mais alinhado ao ENAMED).

Para cada lote:
1. Leia o PDF do caderno e do gabarito
2. Verifique o tipo do gabarito pelo cabeçalho interno
3. Extraia as questões literalmente
4. Case com o gabarito definitivo
5. Enriqueça com explicação, tags e dificuldade
6. Gere o JSON + SQL
7. Reporte o status e avance para o próximo lote

**Execute todos os 16 lotes restantes em sequência, sem parar para aguardar aprovação entre lotes.** Reporte o progresso após cada lote concluído. Só pare se encontrar uma situação não coberta por este protocolo.
