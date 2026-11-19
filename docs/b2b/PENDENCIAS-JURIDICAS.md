# MedPleni B2B — Matriz de Pendências Jurídicas e Decisões Humanas de Compliance (P24)

**Data:** 19/11/2026  
**Finalidade:** Documentar explicitamente as definições legais, regulatórias e contratuais que dependem de decisão humana dos advogados, diretores e DPOs (Encarregados pelo Tratamento de Dados Pessoais) da MedPleni e das Instituições de Ensino Superior (IES) parceiras.

---

## 1. Enquadramento da Base Legal (LGPD - Lei nº 13.709/2018)

| Tratamento Realizado | Hipóteses Legais em Análise | Decisão Humana Necessária | Recomendação Técnica MedPleni |
|---|---|---|---|
| **Realização de Provas, Correção e Notas** | • Execução de contrato educacional (Art. 7º, V)<br>• Cumprimento de obrigação regulatória / MEC (Art. 7º, II) | O jurídico da faculdade deve validar se as avaliações somativas e simulados ENAMED integram o contrato de prestação de serviços educacionais ou derivam das DCNs. | **Art. 7º, II e V combinados**. Não basear em consentimento (que pode ser revogado pelo aluno inviabilizando a avaliação curricular). |
| **Acompanhamento Longitudinal e Alertas** | • Execução de contrato (Art. 7º, V)<br>• Legítimo interesse pedagógico (Art. 7º, IX) | Validar a previsão de avaliação continuada e apoio psicopedagógico no Projeto Pedagógico do Curso (PPC) e Regimento Geral. | **Art. 7º, V**. Inserir no PPC que o acompanhamento longitudinal é instrumento pedagógico formativo regular. |
| **Detecção de Sessões Atípicas (Chute / Refazendo / Consulta Externa)** | • Legítimo interesse do controlador (Art. 7º, IX)<br>• Proteção da integridade avaliativa (Art. 7º, II) | O jurídico deve aprovar o Teste de Ponderação de Legítimo Interesse (LIA) e a redação do aviso não-punitivo presente na interface. | **Art. 7º, IX (Legítimo Interesse)**, garantindo expressamente o direito de revisão humana e transparência algorítmica. |
| **Prática Individual no Módulo B2C** | • Consentimento do usuário (Art. 7º, I)<br>• Execução dos Termos de Uso (Art. 7º, V) | O aluno vinculado à IES que também estuda individualmente no B2C deve ter seus termos de aceite unificados. | Termo de Uso B2C integrado com cláusula clara de reporte acadêmico à faculdade contratante. |

---

## 2. Acordo de Processamento de Dados / Contrato de Operador (DPA)

A MedPleni e a Instituição de Ensino Superior parceira exercem papéis assimétricos e complementares perante a LGPD:

* **Instituição de Ensino Superior (IES):** É a **Controladora** dos dados pessoais dos alunos e professores (toma as decisões sobre matrículas, critérios de corte, aplicação de provas e sanções acadêmicas).
* **MedPleni:** É a **Operadora** técnica dos dados (fornece a infraestrutura em nuvem, algoritmos de correção, modelos de inteligência artificial editorial e acervo de questões).

### Cláusulas Contratuais Pendentes de Redação pelo Jurídico:
1. **Instruções Lícitas do Controlador:** A MedPleni só tratará os dados conforme instruções documentadas da IES e da regulamentação educacional.
2. **Suboperadores Autorizados:** Homologação expressa dos fornecedores de infraestrutura técnica (Supabase/PostgreSQL, provedor de nuvem, provedor de disparo transacional Resend).
3. **Acordo de Nível de Serviço (SLA) para Incidentes:** Prazo máximo de 48 horas úteis para a MedPleni comunicar à faculdade qualquer incidente de segurança relevante.
4. **Assistência ao Controlador:** Compromisso da MedPleni em fornecer as ferramentas necessárias para que a faculdade atenda requisições de titulares (Art. 18 da LGPD) e determinações da ANPD.

---

## 3. Relatório de Impacto à Proteção de Dados Pessoais (RIPD / DPIA)

Conforme o Art. 38 da LGPD, a ANPD pode determinar ao controlador a elaboração de Relatório de Impacto à Proteção de Dados Pessoais quando o tratamento for baseado no legítimo interesse ou envolver grande volume de titulares:

* **Responsabilidade:** A elaboração e assinatura do RIPD competem ao **DPO da Instituição de Ensino**.
* **Insumo Fornecido pela MedPleni:**
  - Descrição da arquitetura de isolamento (Row Level Security no PostgreSQL).
  - Trilha imutável de auditoria (`b2b_governance_audit_logs`) com proteção anti-mutação via trigger.
  - Criptografia em repouso e em trânsito (TLS 1.3).
  - Regra de não-comercialização e expurgo de dados identificáveis em calibração psicométrica.
* **Pendência Humana:** Os DPOs de ambas as partes devem assinar o anexo de medidas técnicas de salvaguarda.

---

## 4. Política de Retenção de Longo Prazo e Expurgo de Logs

Existe uma tensão regulatória clássica entre o Direito Educacional e a Proteção de Dados:

1. **Portaria MEC nº 315/2018 (Acervo Acadêmico):**
   - Exige que os históricos escolares, notas de avaliações somativas e atos de colação de grau sejam guardados de forma **permanente** (ou por até 100 anos em suporte digital com certificação ICP-Brasil).
2. **Princípio da Minimização e Necessidade (LGPD Art. 6º, III):**
   - Exige que dados pessoais sejam eliminados após o término do tratamento ou quando não mais necessários à finalidade informada.

### Decisão Humana Necessária:
* **Decisão recomendada:** Separar os dados em duas camadas:
  1. **Notas e Registro Sumário de Avaliações:** Custódia permanente vinculada ao acervo acadêmico oficial da IES.
  2. **Telemetria de Resoluções e Logs de Acesso (`individual_access_log`):** Expurgo automatizado após **5 anos** da formatura da coorte (prazo prescricional padrão para ações indenizatórias civis).

---

## 5. Telemetria e Uso Agregado de Itens do Acervo MedPleni

A Especificação B2B (P24) determinou que o desempenho psicométrico das questões do acervo MedPleni entre diferentes instituições só pode ser medido em base **estatística desidentificada**:

* **Implementação Técnica Realizada:** Função `validateMedpleniCrossInstitutionAggregation` que rejeita preventivamente qualquer payload que contenha `institution_id`, `student_id` ou nomes.
* **Pendência Jurídica:** Incluir no contrato padrão de adesão B2B a seguinte cláusula de benchmarking acadêmico:
  > *"A IES autoriza expressamente a MedPleni a processar métricas exclusivamente estatísticas e agregadas dos itens de prova (taxa de facilidade p, índice de discriminação D e correlação ponto-bisserial), vedada a identificação de alunos ou da própria IES, com o objetivo único de qualificar e calibrar o acervo de questões disponibilizado às instituições de ensino."*

---

## 6. Encerramento de Contrato e Custódia do Acervo

* **Decisão Humana Necessária:** Definir o formato oficial de entrega do pacote de encerramento da instituição (ex.: dump SQL criptografado + pasta de PDFs das provas e relatórios com dicionário de dados).
* **Prazo de Transição:** A instituição encerrada deve ter prazo de 60 a 90 dias para download seguro antes do bloqueio total de infraestrutura.
