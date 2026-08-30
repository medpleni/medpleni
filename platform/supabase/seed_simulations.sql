-- ==============================================================================
-- MedPleni · Seed de Simulados Oficiais Reais e Políticas RLS
-- ==============================================================================

-- 1. Garante que qualquer usuário pode visualizar os simulados
DROP POLICY IF EXISTS "Simulados visíveis para autenticados" ON public.simulations;
DROP POLICY IF EXISTS "Simulados visíveis publicamente" ON public.simulations;
CREATE POLICY "Simulados visíveis publicamente"
  ON public.simulations FOR SELECT USING (true);

-- 2. Limpa simulados antigos de teste se houver
DELETE FROM public.simulations;

-- 3. Insere os Simulados Oficiais vinculados ao banco real de 1.255 questões
INSERT INTO public.simulations (id, title, institution, area, total_questions, duration_minutes, description, is_active)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'ENAMED 2025 — Prova Oficial na Íntegra',
    'ENAMED',
    'Todas',
    90,
    240,
    'Prova oficial definitiva aplicada pelo INEP. 90 questões reais comentadas com gabarito oficial pós-recursos.',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Super Simulado ENAMED 2027 · Calibrado por IA',
    'ENAMED',
    'Todas',
    100,
    240,
    'Simulado preditivo ponderado na matriz exata da Portaria INEP 478/2025 (23% CM, 17% GO, 16% Ped, 14% MFC, 12% Cirurgia, 10% SC, 8% SM).',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'Revalida 2026/1 — Prova Oficial Definitiva',
    'REVALIDA',
    'Todas',
    100,
    240,
    'Caderno oficial da edição mais recente do Revalida INEP. 100 questões com resolução clínica detalhada.',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'Revalida 2025/1 — Prova Oficial na Íntegra',
    'REVALIDA',
    'Todas',
    97,
    240,
    '97 questões oficiais válidas da primeira edição de 2025 do Revalida INEP com gabarito definitivo.',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'ENARE 2024/2025 — Prova Oficial (Banca FGV)',
    'ENARE',
    'Todas',
    97,
    240,
    'Última prova oficial com questões próprias do ENARE elaboradas pela FGV antes da unificação com o ENAMED.',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000006',
    'ENARE 2021/2022 — Prova Oficial (Instituto AOCP)',
    'ENARE',
    'Todas',
    94,
    240,
    'Prova de acesso direto oficial do ENARE com 94 questões validadas pós-recursos.',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000007',
    'Simulado Temático: Atenção Primária & MFC',
    'TEMÁTICO',
    'Medicina de Família e Comunidade',
    50,
    75,
    'Foco intensivo na área de maior peso emergente do ENAMED: abordagem centrada na pessoa, visitas e PNAB.',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000008',
    'Simulado Temático: Saúde Materno-Infantil',
    'TEMÁTICO',
    'Ginecologia e Obstetrícia',
    60,
    90,
    'Treinamento conjunto de GO e Pediatria cobrindo pré-natal, parto, puerpério, neonatologia e puericultura.',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000009',
    'Simulado Temático: Clínica Médica & Urgências',
    'TEMÁTICO',
    'Clínica Médica',
    60,
    90,
    'Manejo clínico em ambulatório e emergência: cardiologia, pneumologia, nefrologia e infectologia.',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000010',
    'Simulado Temático: Cirurgia Geral & Trauma',
    'TEMÁTICO',
    'Cirurgia Geral',
    50,
    75,
    'Abdome agudo, trauma (ATLS), pré/pós-operatório e patologias cirúrgicas essenciais.',
    true
  );
