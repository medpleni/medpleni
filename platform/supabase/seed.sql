-- ==============================================================================
-- MEDPLENI — Seed Data (Questões, Simulados e Flashcards Iniciais)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SIMULADOS INICIAIS
-- ------------------------------------------------------------------------------
INSERT INTO public.simulations (id, title, institution, area, total_questions, duration_minutes, description) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Clínica Médica — Bloco 4', 'USP', 'Clínica Médica', 60, 90, 'Simulado focado em cardiologia, pneumologia e endocrinologia'),
  ('00000000-0000-0000-0000-000000000002', 'ENARE Completo — Simulação 2025', 'ENARE', 'Clínica Médica', 120, 240, 'Prova completa simulada no padrão ENARE'),
  ('00000000-0000-0000-0000-000000000003', 'Cirurgia Geral — Foco em Lacunas', 'UNIFESP', 'Cirurgia Geral', 40, 60, 'Gerado pela IA com foco nas suas lacunas em cirurgia'),
  ('00000000-0000-0000-0000-000000000004', 'Ginecologia e Obstetrícia — GO Completo', 'USP', 'Ginecologia e Obstetrícia', 80, 120, 'Cobertura completa: pré-natal, parto, puerpério, ginecologia'),
  ('00000000-0000-0000-0000-000000000005', 'Pediatria — Urgências Pediátricas', 'UERJ', 'Pediatria', 50, 75, 'Bronquiolite, cetoacidose, convulsão febril, parada cardíaca'),
  ('00000000-0000-0000-0000-000000000006', 'Saúde Coletiva — Portarias SUS', 'ENARE', 'Saúde Coletiva', 30, 45, 'Princípios do SUS, PNAB, ESF, vigilância epidemiológica')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. FLASHCARDS INICIAIS (SAÚDE COLETIVA)
-- ------------------------------------------------------------------------------
INSERT INTO public.flashcards (front, back, area, subarea) VALUES
  ('Quais são os 3 princípios doutrinários do SUS?', 'Universalidade (acesso a todos), Equidade (tratar desiguais de forma desigual) e Integralidade (ações de promoção, prevenção e recuperação).', 'Saúde Coletiva', 'Princípios do SUS'),
  ('Portaria 2.436/2017 — O que é a PNAB e quais seus atributos essenciais?', 'Política Nacional de Atenção Básica. Atributos essenciais: acesso de primeiro contato, longitudinalidade, integralidade e coordenação do cuidado. Atributos derivados: orientação familiar, orientação comunitária e competência cultural.', 'Saúde Coletiva', 'Atenção Básica'),
  ('Qual a composição mínima da equipe de Estratégia Saúde da Família (ESF)?', 'Médico generalista/família, enfermeiro, técnico/auxiliar de enfermagem e agentes comunitários de saúde (ACS). Pode incluir cirurgião-dentista, auxiliar/técnico em saúde bucal.', 'Saúde Coletiva', 'Estratégia Saúde da Família'),
  ('O que é a Rede de Atenção à Saúde (RAS) e quais seus componentes?', 'Arranjos organizativos integrados de ações e serviços de saúde. Componentes: 1) APS (centro comunicador), 2) pontos de atenção secundária e terciária, 3) sistemas de apoio (diagnóstico, terapêutico), 4) sistemas logísticos (transporte, regulação) e 5) governança.', 'Saúde Coletiva', 'Redes de Atenção'),
  ('Quais são as doenças de notificação compulsória imediata (até 24h)?', 'Botulismo, carbúnculo/antraz, cólera, sarampo, raiva humana, peste, poliomielite, varíola, febre amarela, síndrome respiratória aguda grave (SRAG), meningite meningocócica, entre outras da Lista Nacional (Portaria GM/MS nº 217/2023).', 'Saúde Coletiva', 'Vigilância Epidemiológica'),
  ('Como calcular a Taxa de Mortalidade Infantil (TMI)?', 'TMI = (Óbitos em <1 ano / Nascidos vivos no mesmo período) × 1.000. Componentes: neonatal precoce (0-6 dias), neonatal tardia (7-27 dias) e pós-neonatal (28-364 dias).', 'Saúde Coletiva', 'Indicadores de Saúde'),
  ('Quais são os níveis de prevenção segundo Leavell & Clark?', '1) Prevenção primária: promoção da saúde + proteção específica. 2) Prevenção secundária: diagnóstico precoce + tratamento oportuno + limitação de incapacidade. 3) Prevenção terciária: reabilitação.', 'Saúde Coletiva', 'Epidemiologia'),
  ('O que diferencia incidência de prevalência?', 'Incidência: casos NOVOS em um período / população em risco. Prevalência: casos EXISTENTES (novos + antigos) em um momento / população total. Prevalência = Incidência × Duração. Incidência mede risco; prevalência mede carga da doença.', 'Saúde Coletiva', 'Epidemiologia'),
  ('O que é o NASF-AB e qual seu papel na APS?', 'Núcleo Ampliado de Saúde da Família e Atenção Básica. Equipe multiprofissional (nutricionista, psicólogo, fisioterapeuta, etc.) que apoia as equipes da ESF via matriciamento, clínica ampliada e PTS (Projeto Terapêutico Singular). NÃO é porta de entrada — atua por referência.', 'Saúde Coletiva', 'Atenção Básica'),
  ('Quais os princípios organizativos (operacionais) do SUS?', 'Descentralização (político-administrativa), Regionalização (por regiões de saúde), Hierarquização (níveis de complexidade), Participação social (conselhos e conferências de saúde) e Resolubilidade.', 'Saúde Coletiva', 'Princípios do SUS');

-- ------------------------------------------------------------------------------
-- 3. QUESTÕES E ALTERNATIVAS INICIAIS
-- ------------------------------------------------------------------------------

-- Questão 1
DO $$
DECLARE
  qid UUID;
BEGIN
  INSERT INTO public.questions (code, statement, clinical_context, institution, year, area, subarea, difficulty, explanation, tags)
  VALUES (
    'q_001',
    'Paciente do sexo masculino, 58 anos, hipertenso em uso de losartana 50mg/dia e atorvastatina 40mg/dia, é admitido na emergência com dor precordial em aperto de início há 3 horas, irradiando para o braço esquerdo, associada a sudorese e náuseas. Ao ECG: supradesnivelamento de ST ≥ 1mm em V1–V4. Troponina I ultrassensível: 4.800 pg/mL (referência <52 pg/mL). PA: 148×90 mmHg · FC: 102 bpm · SatO₂: 96%. Qual a conduta imediata mais adequada?',
    'Tempo porta-balão disponível: 47 minutos. Ausculta: bulhas rítmicas, sem sopros.',
    'USP',
    2024,
    'Clínica Médica',
    'Cardiologia — IAMCSST',
    'media',
    'IAMCSST com tempo porta-balão <90 minutos → ICP primária é a estratégia de reperfusão de escolha (Classe I, Nível A — Diretriz SBC/SBH 2023). A trombólise seria aceitável apenas se ICP não estivesse disponível em tempo hábil.',
    ARRAY['IAMCSST', 'ICP primária', 'reperfusão', 'cardiologia']
  )
  ON CONFLICT (code) DO UPDATE SET statement = EXCLUDED.statement
  RETURNING id INTO qid;

  DELETE FROM public.question_options WHERE question_id = qid;
  INSERT INTO public.question_options (question_id, letter, text, is_correct) VALUES
    (qid, 'A', 'Encaminhar para angioplastia coronária primária (ICP primária) — tempo porta-balão disponível dentro de 90 minutos é a estratégia de reperfusão de escolha no IAMCSST', TRUE),
    (qid, 'B', 'Iniciar trombólise com alteplase 100mg IV em razão do tempo de evolução favorável (3 horas)', FALSE),
    (qid, 'C', 'Administrar heparina não-fracionada IV e solicitar ecocardiograma de urgência antes de qualquer intervenção', FALSE),
    (qid, 'D', 'Administrar AAS 300mg + clopidogrel 600mg e aguardar nova dosagem de troponina em 3 horas para confirmar diagnóstico', FALSE),
    (qid, 'E', 'Iniciar dobutamina IV para suporte hemodinâmico e transferir para UTI cardíaca para monitorização', FALSE);
END $$;

-- Questão 2
DO $$
DECLARE
  qid UUID;
BEGIN
  INSERT INTO public.questions (code, statement, clinical_context, institution, year, area, subarea, difficulty, explanation, tags)
  VALUES (
    'q_002',
    'Mulher, 45 anos, previamente hígida, procura ambulatório referindo dispneia progressiva aos esforços há 6 meses, tosse seca e fadiga. Exame físico: FR 22 irpm, murmúrio vesicular reduzido em bases, estertores finos bibasais (tipo velcro). TC de tórax: opacidades reticulares bibasais com padrão de favo de mel subpleural. Espirometria: CVF 62% do previsto, VEF1/CVF 0,85. Qual o diagnóstico mais provável?',
    'Não tabagista. Sem exposição ocupacional relevante. Sem uso de medicações. SatO₂: 92% em repouso.',
    'UNIFESP',
    2024,
    'Clínica Médica',
    'Pneumologia — Doenças intersticiais',
    'alta',
    'Padrão de UIP (pneumonia intersticial usual) na TC: reticulação bibasal + favo de mel subpleural. Espirometria com padrão restritivo (CVF reduzida, VEF1/CVF normal). Estertores tipo velcro são típicos de FPI. DPOC teria padrão obstrutivo.',
    ARRAY['FPI', 'UIP', 'restritivo', 'favo de mel']
  )
  ON CONFLICT (code) DO UPDATE SET statement = EXCLUDED.statement
  RETURNING id INTO qid;

  DELETE FROM public.question_options WHERE question_id = qid;
  INSERT INTO public.question_options (question_id, letter, text, is_correct) VALUES
    (qid, 'A', 'Fibrose pulmonar idiopática (FPI)', TRUE),
    (qid, 'B', 'Doença pulmonar obstrutiva crônica (DPOC)', FALSE),
    (qid, 'C', 'Sarcoidose pulmonar', FALSE),
    (qid, 'D', 'Pneumonia por hipersensibilidade crônica', FALSE),
    (qid, 'E', 'Bronquiectasias difusas', FALSE);
END $$;

-- Questão 3
DO $$
DECLARE
  qid UUID;
BEGIN
  INSERT INTO public.questions (code, statement, clinical_context, institution, year, area, subarea, difficulty, explanation, tags)
  VALUES (
    'q_003',
    'Homem, 62 anos, diabético tipo 2 há 15 anos, em uso de metformina 2g/dia + gliclazida 60mg/dia, apresenta HbA1c de 9,2% em exame de rotina. Creatinina sérica: 1,8 mg/dL (TFGe: 38 mL/min/1,73m²). Qual a conduta farmacológica mais adequada para o controle glicêmico?',
    'IMC: 31 kg/m². PA: 140×88 mmHg. Relação albuminúria/creatinina: 320 mg/g.',
    'ENARE',
    2025,
    'Clínica Médica',
    'Endocrinologia — Diabetes tipo 2',
    'alta',
    'Com TFGe de 38 mL/min (<45 mL/min), metformina deve ser suspensa pelo risco de acidose lática. Gliclazida também tem risco aumentado de hipoglicemia com função renal reduzida. Insulina basal é a opção mais segura nesse cenário.',
    ARRAY['DM2', 'DRC', 'metformina', 'insulina']
  )
  ON CONFLICT (code) DO UPDATE SET statement = EXCLUDED.statement
  RETURNING id INTO qid;

  DELETE FROM public.question_options WHERE question_id = qid;
  INSERT INTO public.question_options (question_id, letter, text, is_correct) VALUES
    (qid, 'A', 'Manter metformina, suspender gliclazida e iniciar insulina basal + inibidor de SGLT2', FALSE),
    (qid, 'B', 'Suspender metformina, manter gliclazida e associar pioglitazona', FALSE),
    (qid, 'C', 'Suspender metformina (TFGe <45), suspender gliclazida e iniciar insulina basal com ajuste gradual', TRUE),
    (qid, 'D', 'Manter ambos e adicionar acarbose 300mg/dia', FALSE),
    (qid, 'E', 'Trocar tudo para insulina NPH em 3 doses diárias', FALSE);
END $$;
