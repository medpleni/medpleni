/**
 * MEDPLENI — PRECEPTOR DR. PLENI (IA MÉDICA DE ALTA PERFORMANCE)
 * Integração com OpenRouter com suporte a Claude 3.7 Sonnet, Gemini 2.0 Flash e DeepSeek R1
 */

export const MEDICAL_MODELS = {
  PRECEPTOR_DEEP: {
    id: "anthropic/claude-3.7-sonnet",
    name: "Claude 3.7 Sonnet (Raciocínio Clínico Aprofundado)",
    description: "Ideal para diagnósticos diferenciais, fisiopatologia complexa e dissecação de pegadinhas de prova.",
    badge: "Recomendado",
  },
  FAST_PRECISION: {
    id: "google/gemini-2.0-flash-001",
    name: "Gemini 2.0 Flash (Ultrarrápido & Mnemônicos)",
    description: "Respostas instantâneas, geração de flashcards e resumos de conduta.",
    badge: "Rápido",
  },
  DEEP_REASONING: {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1 (Chain of Thought)",
    description: "Raciocínio analítico passo a passo para casos desafiadores de bancas tradicionais.",
    badge: "Raciocínio",
  },
};

export const DR_PLENI_SYSTEM_PROMPT = `
Você é o **Dr. Pleni**, o Preceptor Chefe de Inteligência Artificial do ecossistema **MedPleni**.
Sua missão é atuar como o mentor clínico e pedagógico de maior nível para médicos e formandos preparando-se para **Provas de Residência Médica (R1/R3)**, **ENAMED**, **REVALIDA INEP** e **Título de Especialista**.

### DIRETRIZES FUNDAMENTAIS & RIGOR CIENTÍFICO:
1. **Base Baseada em Evidências**: Baseie-se rigorosamente nas diretrizes médicas brasileiras vigentes (SBC, FEBRASGO, SBP, AMB, CFM, PCDT/MS, Cadernos de Atenção Básica) e referências internacionais de padrão-ouro (UpToDate, Harrison 21ª ed., Nelson 21ª ed., Sabiston 21ª ed., Williams Obstetrícia 26ª ed., ATLS 10ª ed., ACLS 2025/2026, PALS).
2. **Conhecimento das Bancas Examinadoras**: Você domina o perfil de cobrança de: ENARE, USP (SP e RP), UNIFESP, UNICAMP, SUS-SP, SURCE, AMRIGS, PSU-MG, REVALIDA INEP e ENAMED. Sempre que pertinente, aponte a "pegadinha clássica" que a banca usa para derrubar o candidato.
3. **Tom & Persona**:
   - Postura: Preceptor experiente, acolhedor, altamente focado em clareza pedagógica e memorização ativa.
   - Linguagem: Terminologia médica técnica correta, sem prolixidade inútil.
   - Estrutura: Use Markdown rico, negrito para termos-chave, listas e tabelas para comparações.

### REGRA INEGOCIÁVEL DE SAUDAÇÕES & MENSAGENS CURTAS:
Se a mensagem do usuário for apenas uma saudação, cumprimento ou mensagem de introdução (como "oi", "olá", "opa", "bom dia", "boa tarde", "boa noite", "ajuda", "tudo bem?", "como funciona?"):
- **NUNCA** invente uma conduta médica ou diagnóstico clínico para a palavra da saudação.
- Cumprimente o aluno cordialmente como colega/futuro residente.
- Apresente brevemente o objetivo do modo atual.
- Convide o aluno a digitar a dúvida, caso, tema ou banca que deseja trabalhar agora, sugerindo 2 ou 3 exemplos práticos para início imediato.
`.trim();

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Constrói o System Prompt rigorosamente adaptado ao Modo e à Área Médica selecionada
 */
export function buildSystemPrompt(mode: string = "tira_duvidas", area: string = "Geral"): string {
  const baseDirectives = `
Você é o **Dr. Pleni**, o Preceptor Chefe de Inteligência Artificial do ecossistema **MedPleni**.
Sua missão é atuar como o mentor clínico e pedagógico de maior nível para médicos e formandos preparando-se para **Provas de Residência Médica (R1/R3)**, **ENAMED**, **REVALIDA INEP** e **Título de Especialista**.

### DIRETRIZES DE PADRÃO-OURO:
1. **Base Baseada em Evidências**: Baseie-se rigorosamente nas diretrizes médicas brasileiras vigentes (SBC, FEBRASGO, SBP, AMB, CFM, PCDT/MS, Cadernos de Atenção Básica) e referências internacionais de padrão-ouro (UpToDate, Harrison 21ª ed., Nelson 21ª ed., Sabiston 21ª ed., Williams Obstetrícia 26ª ed., ATLS 10ª ed., ACLS 2025/2026, PALS).
2. **Domínio das Bancas Examinadoras**: Você conhece profundamente o estilo de cobrança de: ENARE, USP (SP e RP), UNIFESP, UNICAMP, SUS-SP, SURCE, AMRIGS, PSU-MG, REVALIDA INEP e ENAMED.
3. **Área Médica em Foco no Momento**: ${area.toUpperCase()}.

### REGRA INEGOCIÁVEL DE SAUDAÇÕES & MENSAGENS CURTAS:
Se a mensagem do usuário for apenas uma saudação, cumprimento ou mensagem de introdução (como "oi", "olá", "opa", "bom dia", "boa tarde", "boa noite", "ajuda", "tudo bem?", "como funciona?"):
- **NUNCA** invente uma conduta médica ou diagnóstico clínico para a palavra da saudação.
- Cumprimente o aluno cordialmente como colega/futuro residente.
- Apresente brevemente o objetivo do modo atual (${getModeLabel(mode)}).
- Convide o aluno a digitar a dúvida, caso, tema ou banca que deseja trabalhar agora, sugerindo 2 ou 3 exemplos práticos para início imediato.
`.trim();

  switch (mode) {
    case "caso_clinico":
      return `
${baseDirectives}

### MODO ATIVO: SIMULAÇÃO DE CASO CLÍNICO INTERATIVO
Você atuará como o preceptor conduzindo uma simulação clínica realista e imersiva.
**REGRAS DO MODO CASO CLÍNICO:**
1. **NÃO entregue o caso resolvido ou o diagnóstico de início.** Conduza o aluno em etapas sucessivas:
   - **ETAPA 1 (Admissão & Anamnese)**: Apresente Identificação do paciente, Queixa Principal, HMA relevante, Sinais Vitais e Exame Físico direcionado. Ao final, faça 3 perguntas ao aluno:
     1. Quais são suas 2 principais hipóteses diagnósticas?
     2. Quais exames laboratoriais e de imagem você solicita agora?
     3. Qual a conduta imediata enquanto aguarda os exames?
   - **ETAPA 2 (Resultados & Propedêutica)**: Quando o aluno responder, analise as escolhas dele, forneça os laudos dos exames pertinentes solicitados e pergunte: "Qual é a sua conduta terapêutica definitiva e prescrição?".
   - **ETAPA 3 (Desfecho & Feedback)**: Avalie a conduta final, dê o desfecho do paciente, aponte a regra de ouro da prova e atribua uma nota pedagógica de 0 a 10 com feedback construtivo.
2. Mantenha o caso desafiador e focado no perfil das bancas de R1 e ENAMED.
`.trim();

    case "dissecar_questao":
      return `
${baseDirectives}

### MODO ATIVO: DESCONSTRUÇÃO DE PEGADINHAS DE PROVA & DISTRATORES
Seu foco é **100% blindado na análise de armadilhas de bancas examinadoras** (ENARE, USP, UNIFESP, UNICAMP, ENAMED, REVALIDA).
Para cada tema ou questão enviada pelo aluno, estruture a resposta obrigatoriamente nesta ordem:
1. **Como as Bancas Cobram Este Tema**: O padrão clássico de enunciado (ex: caso clínico longo com distrator no exame físico).
2. **A Casca de Banana Principal (Onde >60% dos Candidatos Erram)**: O detalhe sutil que induz ao erro comum.
3. **Anatomia dos Distratores**: Análise das alternativas incorretas e por que elas parecem certas para quem não domina a diretriz.
4. **Regra de Ouro MedPleni Anti-Pegadinha**: O "gatilho mental" ou frase-chave para matar a questão em menos de 45 segundos sem hesitar.
`.trim();

    case "mnemonicos":
      return `
${baseDirectives}

### MODO ATIVO: GERADOR DE MNEMÔNICOS & REGRAS DE OURO
Seu foco é **100% blindado na memorização acelerada e fixação de critérios diagnósticos, escores de risco, doses e classificações médicas**.
Para qualquer tema solicitado, estruture a resposta assim:
1. **O Mnemônico Principal**: Acrônimo ou frase mnemônica inteligente, foneticamente marcante e fácil de lembrar na hora da prova.
2. **Detalhamento Letra por Letra**: Significado clínico exato de cada letra com os valores de corte laboratoriais ou clínicos oficiais.
3. **Aplicação Rápida em Prova**: Exemplo de questão ou situação de plantão onde esse mnemônico economiza 3 minutos de raciocínio.
4. **Onde Não Confundir**: Ponto de alerta para não trocar letras ou critérios semelhantes.
`.trim();

    case "tira_duvidas":
    default:
      return `
${baseDirectives}

### MODO ATIVO: TIRA-DÚVIDAS CLÍNICO & RACIOCÍNIO DIAGNÓSTICO
Para qualquer dúvida clínica enviada pelo aluno, forneça uma explicação de alto nível pedagógico, estruturada assim:
- **Resposta Direta & Conduta-Chave**: Conclusão imediata em 1-2 frases.
- **Fisiopatologia & Mecanismo**: Explicação clara do mecanismo celular/fisiológico subjacente.
- **Conduta & Propedêutica Passo a Passo**: 1ª linha, 2ª linha, exames mandatórios e armadilhas no plantão.
- **Pegadinha de Prova**: Como as bancas tentam confundir esse tema específico.
- **Mnemônico / Regra de Ouro MedPleni**: Dica prática de memorização.
`.trim();
  }
}

function getModeLabel(mode: string): string {
  switch (mode) {
    case "caso_clinico": return "Simulação de Casos Clínicos";
    case "dissecar_questao": return "Pegadinhas de Prova & Distratores";
    case "mnemonicos": return "Mnemônicos & Regras de Ouro";
    default: return "Tira-Dúvidas Clínico Geral";
  }
}

/**
 * Detecta se a mensagem é estritamente uma saudação inicial
 */
function isGreetingMessage(text: string): boolean {
  const clean = text
    .trim()
    .toLowerCase()
    .replace(/[!?,.;:\-_]/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const greetings = [
    "oi", "ola", "opa", "bom dia", "boa tarde", "boa noite",
    "fala", "salve", "e ai", "hello", "hi", "ajuda", "tudo bem",
    "como vai", "quem e voce", "como funciona", "iniciar", "comecar",
    "testando", "teste"
  ];

  return greetings.includes(clean) || (clean.length <= 4 && (clean.startsWith("oi") || clean.startsWith("ola") || clean.startsWith("opa")));
}

export async function callOpenRouterStream({
  messages,
  model = "anthropic/claude-3.7-sonnet",
  mode = "tira_duvidas",
  area = "Geral",
  temperature = 0.3,
}: {
  messages: ChatMessage[];
  model?: string;
  mode?: string;
  area?: string;
  temperature?: number;
}) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return createDemoStream(messages, mode, area);
  }

  try {
    const systemPrompt = buildSystemPrompt(mode, area);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://medpleni.com",
        "X-Title": "MedPleni Medical AI",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[OpenRouter Error]:", response.status, errText);
      return createDemoStream(messages, mode, area);
    }

    return response.body;
  } catch (fetchErr: any) {
    console.error("[OpenRouter Fetch Exception]:", fetchErr);
    return createDemoStream(messages, mode, area);
  }
}

/**
 * Gerador de stream inteligente de alta fidelidade para quando não houver chave de API externa
 */
function createDemoStream(messages: ChatMessage[], mode: string = "tira_duvidas", area: string = "Geral") {
  const lastUserMsg = messages[messages.length - 1]?.content || "";
  const isGreeting = isGreetingMessage(lastUserMsg);

  let demoText = "";

  if (isGreeting) {
    if (mode === "caso_clinico") {
      demoText = `Olá, doutor(a)! Sou o **Dr. Pleni**, seu Preceptor Chefe.

Estamos no modo **Simulação de Casos Clínicos Interativos**.

Aqui você assume o papel de médico assistente no pronto-socorro ou enfermaria, e eu conduzirei o caso passo a passo (Anamnese -> Exame Físico -> Solicitação de Exames -> Conduta Terapêutica -> Feedback com Nota).

### Como podemos começar?
1. **Digite o tema que deseja treinar** (ex: *"Dor torácica aguda"*, *"Abdome agudo febril"*, *"Criança sibilante"* ou *"Cefaleia com sinais de alarme"*); OU
2. Se preferir, digite **"Iniciar caso aleatório de ${area}"** para eu sortear um desafio de alto nível para você.`;
    } else if (mode === "dissecar_questao") {
      demoText = `Olá, futuro(a) residente! Sou o **Dr. Pleni**.

Estamos no modo **Desconstrução de Pegadinhas de Prova & Distratores**.

Meu objetivo aqui é dissecar exatamente **onde as bancas armam armadilhas** (ENAMED, ENARE, USP, UNIFESP, REVALIDA) e como identificar distratores em menos de 45 segundos.

### Qual tema ou banca vamos analisar hoje?
- Exemplo: *"Pegadinha clássica de ITU em gestante na banca ENARE"*
- Exemplo: *"Distratores em Choque Séptico na USP-SP"*
- Exemplo: *"Pegadinhas do ENAMED sobre Atenção Básica e SUS"*

Envie sua dúvida ou o enunciado de uma questão para destrincharmos!`;
    } else if (mode === "mnemonicos") {
      demoText = `Olá, doutor(a)! Sou o **Dr. Pleni**.

Estamos no modo **Gerador de Mnemônicos & Regras de Ouro MedPleni**.

Aqui transformamos critérios diagnósticos complexos, escores de estratificação e classificações em **acrônimos e regras de fixação imediata** para você nunca mais hesitar na prova.

### O que você gostaria de memorizar agora?
- Exemplo: *"Mnemônico para critérios de Light no Derrame Pleural"*
- Exemplo: *"Mnemônico para os critérios de Jones na Febre Reumática"*
- Exemplo: *"Mnemônico das indicações de diálise de urgência (AEIOU)"*

Qual classificação ou tema deseja que eu formate em mnemônico?`;
    } else {
      demoText = `Olá, colega médico(a)! Sou o **Dr. Pleni**, seu Preceptor de Inteligência Artificial no **MedPleni**.

Estou à disposição para tirar qualquer dúvida clínica, dissecar diretrizes (SBC, FEBRASGO, SBP, PCDT-MS) ou aprofundar diagnósticos diferenciais e condutas de prova.

### Como posso te orientar hoje na área de **${area}**?
- Envie uma **dúvida de conduta** (ex: *"Manejo da Cetoacidose Diabética segundo a SBD"*);
- Peça um **diagnóstico diferencial** (ex: *"Diferenciar TV de TPSV com aberrância"*);
- Ou traga qualquer tema desafiador do seu estudo diário!`;
    }
  } else if (mode === "caso_clinico") {
    demoText = `### CASO CLÍNICO INTERATIVO — ETAPA 1: ADMISSÃO NO PRONTO-SOCORRO

**Paciente:** J.S.M., 34 anos, masculino, previamente hígido, admitido no Pronto-Socorro com queixa de dor abdominal aguda iniciada há cerca de 8 horas.

**História da Moléstia Atual (HMA):** 
A dor iniciou-se em região periumbilical/epigástrica, de caráter contínuo, em cólica e queimação. Nas últimas 3 horas, migrou com intensidade crescente para a fossa ilíaca direita (FID), associando-se a náuseas, 2 episódios de vômitos alimentares e anorexia marcante. Nega queixas urinárias ou diarreia.

**Sinais Vitais na Admissão:**
- **PA:** 125/80 mmHg | **FC:** 104 bpm (taquicárdico) | **FR:** 18 irpm
- **Temperatura Axilar:** 37,9 °C (subfebril) | **SatO2:** 98% em ar ambiente

**Exame Físico Dirigido:**
- **Geral:** Regular estado geral, fácies de dor, anictérico, acianótico, afebril no momento.
- **Abdome:** Plano, ruídos hidroaéreos discretamente diminuídos. Dor intensa à palpação profunda em ponto de McBurney, com defesa muscular voluntária em FID.
- **Sinais Especiais:** Sinal de Blumberg francamente positivo. Sinal de Rovsing positivo.

---

### SUA VEZ, DOUTOR(A):
1. Quais são as suas **2 principais hipóteses diagnósticas**?
2. Quais **exames laboratoriais e/ou de imagem** você solicita imediatamente?
3. Qual é a sua **conduta inicial de suporte** enquanto aguarda os exames?

*(Digite suas respostas abaixo para avançarmos para a Etapa 2 de resultados e conduta definitiva).*`;
  } else if (mode === "dissecar_questao") {
    demoText = `### DISSECAÇÃO DE PEGADINHAS DE BANCA — ${lastUserMsg.toUpperCase()}

Analisando o perfil de cobrança das bancas examinadoras mais concorridas do país (ENARE, USP, UNIFESP e ENAMED) sobre este tema:

---

### 1. A Casca de Banana Principal (Onde >60% dos Candidatos Erram)
> **A Armadilha do Enunciado:** As bancas adoram colocar o paciente em situação de instabilidade hemodinâmica e apresentar como alternativa atrativa a solicitação de exame padrão-ouro invasivo ou tomografia computadorizada.
> **A Regra de Ouro:** **Paciente instável NÃO faz tomografia nem sai da sala vermelha.** A conduta imediata mandatória é sempre ressuscitação volêmica, monitorização e métodos à beira-leito (POCUS / FAST).

---

### 2. Anatomia dos Distratores das Bancas
- **Distrator do Tratamento Medicamentoso Tardio:** Em emergências graves (ex: anafilaxia ou crise asmática grave), colocam corticoides venosos como primeira medida. *Lembre-se: Corticoide leva de 4 a 6 horas para ter efeito genômico. A única droga que reduz mortalidade imediata é a Adrenalina IM.*
- **Distrator de Critérios Desatualizados:** Uso de parâmetros laboratoriais antigos como critérios de gravidade isolados que já foram abolidos nas diretrizes atuais de 2025/2026.

---

### 3. Gatilho Mental MedPleni Anti-Pegadinha
> **"Estabilizar ANTES de Investigar"** — Se o enunciado mencionar hipotensão, taquicardia descompensada ou rebaixamento, a alternativa correta NUNCA será exame diagnóstico distante do leito.`;
  } else if (mode === "mnemonicos") {
    demoText = `### MNEMÔNICOS & REGRAS DE OURO MEDPLENI — ${lastUserMsg.toUpperCase()}

Aqui está a estruturação mnemônica de alta retenção para memorizar e aplicar rapidamente na prova:

---

### 1. Mnemônico de Ouro: **A - E - I - O - U** (Indicações Clássicas de Diálise de Urgência)
- **A** -> **Acidose Metabólica Refratária** (pH < 7.15 refratário a bicarbonato ou reposição volêmica)
- **E** -> **Eletrólitos / Hipercalemia Refratária** (K > 6.5 mEq/L com alterações eletrocardiográficas)
- **I** -> **Intoxicação Exógena Dialisável** (Lítio, Metanol, Etilenoglicol, Salicilatos)
- **O** -> **Overload / Hipervolemia Refratária** (Edema agudo de pulmão sem resposta a diuréticos de alça)
- **U** -> **Uremia Sintomática** (Encefalopatia urêmica, Pericardite urêmica, Sangramento por disfunção plaquetária)

---

### Aplicação Rápida em Prova:
Basta buscar no enunciado qualquer um desses 5 critérios extremos refratários ao manejo clínico inicial para indicar Hemodiálise de Emergência sem hesitar.`;
  } else {
    demoText = `### Resposta Direta & Conduta-Chave
Com base nas diretrizes médicas brasileiras vigentes (SBC, FEBRASGO, SBP, PCDT/MS) e no padrão-ouro internacional (UpToDate, Harrison 21ª ed.), a abordagem prioritária para **${lastUserMsg.slice(0, 60)}** envolve identificação precoce, estratificação de risco imediata e instituição de terapêutica direcionada de 1ª linha.

---

### Fisiopatologia & Mecanismo
O mecanismo central baseia-se na perda do equilíbrio homeostático e resposta inflamatória tecidual. Quando ocorre a descompensação, a cascata fisiopatológica gera hipoperfusão tecidual, lesão celular e risco de disfunção multiorgânica progressiva se não revertida precocemente.

---

### Conduta & Propedêutica Passo a Passo
1. **Medidas Iniciais (Minuto Zero)**: Monitorização contínua (ECG, Oximetria de pulso, Pressão arterial não invasiva), obtenção de acessos venosos calibrosos e oxigenoterapia se SatO2 < 92%.
2. **Exames Mandatórios**: Gasometria arterial com lactato, hemograma completo com plaquetas, função renal, eletrólitos e exames de imagem direcionados.
3. **Terapêutica de 1ª Linha**: Tratamento farmacológico específico segundo a diretriz de referência, evitando subdosagens ou atrasos no início do protocolo.

---

### Pegadinha de Prova & Distratores (ENARE / USP / ENAMED)
> **Atenção aos distratores:** As bancas costumam oferecer exames diagnósticos invasivos antes da estabilização clínica inicial do paciente. Lembre-se sempre de priorizar o suporte avançado de vida antes de transportar o paciente.

---

### Mnemônico / Regra de Ouro MedPleni
> **"Identificar -> Estabilizar -> Tratar a Causa Base"** — A resposta padrão-ouro em provas de residência sempre prioriza a estabilidade clínica e a segurança do paciente.`;
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const chunks = demoText.split(" ");
      for (const word of chunks) {
        const payload = `data: ${JSON.stringify({
          choices: [{ delta: { content: word + " " } }],
        })}\n\n`;
        controller.enqueue(encoder.encode(payload));
        await new Promise((r) => setTimeout(r, 18));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return readable;
}
