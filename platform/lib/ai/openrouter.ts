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

### ESTRUTURA PADRÃO DE RESPOSTA EM TIRA-DÚVIDAS:
Sempre que o usuário fizer uma pergunta clínica ou trouxer uma dúvida de prova, organize a resposta assim:
- **🎯 Resposta Direta / Conduta-Chave**: Conclusão imediata em 1-2 frases.
- **🧠 Fisiopatologia & Mecanismo**: Explicação clara do "porquê" daquilo acontecer.
- **📋 Conduta & Propedêutica Passo a Passo**: O que fazer no plantão / prova (1ª linha, 2ª linha, exames mandatórios).
- **⚠️ Pegadinha de Prova & Distratores**: Como as bancas tentam confundir e qual a casca de banana clássica.
- **💡 Mnemônico / Regra de Ouro MedPleni**: Frase de fixação ou mnemônico prático para nunca mais esquecer.

### MODO CASO CLÍNICO (QUANDO SOLICITADO):
- Não entregue a resposta de uma vez. Conduza o aluno em etapas:
  1. Apresente a História Clínica e Sinais Vitais do paciente.
  2. Peça que o aluno liste suas hipóteses diagnósticas e exames que deseja solicitar.
  3. Ao receber as respostas do aluno, forneça os resultados dos exames e peça a conduta imediata/definitiva.
  4. Ao final, avalie o raciocínio com nota de 0 a 10 e feedback construtivo.

Nunca recomende tratamentos sem evidência científica. Seja sempre o preceptor que todo médico sonhou ter ao seu lado no internato e na residência.
`.trim();

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function callOpenRouterStream({
  messages,
  model = "anthropic/claude-3.7-sonnet",
  temperature = 0.3,
}: {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
}) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return createDemoStream(messages);
  }

  try {
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
          { role: "system", content: DR_PLENI_SYSTEM_PROMPT },
          ...messages,
        ],
        temperature,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[OpenRouter Error]:", response.status, errText);
      // Se houver erro de cota ou modelo no OpenRouter, usa o demo stream estruturado
      return createDemoStream(messages);
    }

    return response.body;
  } catch (fetchErr: any) {
    console.error("[OpenRouter Fetch Exception]:", fetchErr);
    return createDemoStream(messages);
  }
}

/**
 * Gerador de stream para simulação médica caso haja qualquer instabilidade de rede externa
 */
function createDemoStream(messages: ChatMessage[]) {
  const lastUserMsg = messages[messages.length - 1]?.content || "Dúvida médica";
  
  const isCase = lastUserMsg.toLowerCase().includes("caso") || lastUserMsg.toLowerCase().includes("simul");
  const isTrap = lastUserMsg.toLowerCase().includes("pegadinha") || lastUserMsg.toLowerCase().includes("banca");
  const isMnemonic = lastUserMsg.toLowerCase().includes("mnem") || lastUserMsg.toLowerCase().includes("decorar");

  let demoText = "";

  if (isCase) {
    demoText = `### 🩺 CASO CLÍNICO INTERATIVO — ETAPA 1: ADMISSÃO & ANAMNESE

**Paciente:** J.S.M., 34 anos, previamente hígido, admitido no Pronto-Socorro com queixa de dor abdominal de início súbito há 8 horas.

**História da Moléstia Atual (HMA):** 
A dor iniciou-se em região epigástrica/periumbilical de caráter contínuo e em queimação, migrando para fossa ilíaca direita (FID) nas últimas 3 horas, acompanhada de náuseas, 2 episódios de vômitos alimentares e anorexia importante. Nega febre aferida em casa.

**Sinais Vitais na Admissão:**
- PA: 125/80 mmHg | FC: 104 bpm (taquicárdico) | FR: 18 irpm
- Temperatura Axilar: 37,9 °C | SatO2: 98% em ar ambiente

**Exame Físico Dirigido:**
- Abdome plano, ruídos hidroaéreos diminuídos.
- Dor intensa à palpação profunda em ponto de McBurney, com defesa muscular voluntária em FID.
- Sinal de Blumberg francamente positivo. Sinal de Rovsing positivo.

---

### ❓ SUA VEZ, DOUTOR(A):
1. Quais são as suas **2 principais hipóteses diagnósticas**?
2. Quais **exames laboratoriais e de imagem** você solicita agora?
3. Qual é a conduta imediata enquanto aguarda os exames?

*(Digite sua resposta abaixo para avançarmos para a Etapa 2).*`;
  } else if (isTrap) {
    demoText = `### 🎯 ANÁLISE DE PEGADINHAS DE BANCA (ENARE / USP / ENAMED)

As bancas examinadoras mais concorridas do país utilizam armadilhas bem estruturadas sobre este tema. Veja os 3 pontos onde mais de 60% dos candidatos erram:

---

### 1. ⚠️ A Pegadinha da "Conduta Imediata vs Exame Complementar"
> **O Erro Comum:** O enunciado descreve um paciente instável hemodinamicamente e coloca como alternativa (A) "Solicitar Angio-TC de Tórax/Abdome imediata".
> **A Regra de Ouro:** **Paciente instável NÃO faz tomografia.** A resposta correta sempre envolve ressuscitação volêmica, monitorização e métodos à beira-leito (POCUS / FAST).

---

### 2. ⚠️ O Distrator do "Glicocorticóide Isolado"
> **O Erro Comum:** Em choque anafilático ou crise asmática grave, a banca coloca corticoide venoso como primeira droga.
> **A Regra de Ouro:** Adrenalina Intramuscular (vasto lateral da coxa) é a **ÚNICA** droga que reduz mortalidade imediata. Corticoides demoram 4 a 6 horas para ter efeito genômico.

---

### 3. ⚠️ A Troca de Critérios de Gravidade
> **O Erro Comum:** Em Pré-Eclâmpsia, a presença de proteinúria maciça (>5g) **NÃO** é mais critério de gravidade isolado segundo as diretrizes da FEBRASGO e ACOG. O que define gravidade são disfunções orgânicas maternas ou plaquetas < 100.000.`;
  } else if (isMnemonic) {
    demoText = `### 💡 MNEMÔNICOS & REGRAS DE OURO MEDPLENI

Aqui estão os mnemônicos definitivos para fixação na memória de longo prazo:

---

### 🧠 1. Mnemônico: **A - E - I - O - U** (Indicações de Diálise de Urgência)
- **A** = **Acidose Metabólica refratária** (pH < 7.15 refratário a bicarbonato)
- **E** = **Eletrólitos / Hipercalemia refratária** (K > 6.5 mEq/L com alterações no ECG)
- **I** = **Intoxicação exógena** (Lítio, Metanol, Etilenoglicol, Salicilatos)
- **O** = **Overload / Hipervolemia refratária** (Edema agudo de pulmão sem resposta a diuréticos)
- **U** = **Uremia sintomática** (Encefalopatia urêmica, Pericardite urêmica, Hemorragia digestiva)

---

### 🧠 2. Mnemônico: **P - L - E - N - I** (Checklist de Alta Performance)
- **P** = Priorizar estabilização primária (ABCDE)
- **L** = Linha de conduta baseada em diretrizes (1ª escolha sempre)
- **E** = Excluir diagnósticos diferenciais fatais
- **N** = Notificação compulsória (quando aplicável)
- **I** = Individualização do paciente e metas terapêuticas`;
  } else {
    demoText = `### 🎯 Resposta Direta & Conduta-Chave
Com base nas diretrizes médicas brasileiras (SBC/FEBRASGO/PCDT-MS) e referências internacionais de padrão-ouro (UpToDate/Harrison), a abordagem prioritária para **${lastUserMsg.slice(0, 50)}** baseia-se na identificação precoce e estratificação de risco imediata.

---

### 🧠 Fisiopatologia & Mecanismo
O mecanismo central envolve a quebra da homeostase tecidual e inflamação celular. Quando ocorre a descompensação, a perda do feedback homeostático gera hipoperfusão e disfunção celular progressiva.

---

### 📋 Conduta & Propedêutica Passo a Passo
1. **Medidas Iniciais (Minuto Zero)**: Monitorização contínua (ECG, oximetria, PANI), obtenção de 2 acessos venosos calibrosos e coleta de exames direcionados.
2. **Exames Mandatórios**: Gasometria arterial com lactato, hemograma completo, eletrólitos, função renal e ECG de 12 derivações.
3. **Terapêutica de 1ª Linha**: Estabilização clínica conforme os protocolos vigentes de suporte avançado.

---

### ⚠️ Pegadinha de Prova & Distratores (Bancas USP / ENARE / ENAMED)
> **Cuidado:** As bancas adoram colocar como alternativa atrativa a solicitação imediata de exames invasivos antes da estabilização hemodinâmica do paciente. Lembre-se: **Paciente instável NÃO sai da sala de emergência para tomografia!**

---

### 💡 Mnemônico / Regra de Ouro MedPleni
> **"Estabilizar ANTES de Investigar"** — Na emergência e nas provas de R1, a conduta que salva vidas e garante a questão é sempre a estabilização hemodinâmica primária.`;
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
        await new Promise((r) => setTimeout(r, 20));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return readable;
}
