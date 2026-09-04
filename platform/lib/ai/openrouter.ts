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
  1. Apresente a História Clínica e Sinais Vitais.
  2. Peça que o aluno liste suas hipóteses e exames que deseja solicitar.
  3. Forneça os resultados e peça a conduta definitiva.
  4. Avalie o raciocínio com nota e feedback construtivo.

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

  // Fallback inteligente se a chave ainda não estiver configurada no .env.local
  if (!apiKey) {
    return createDemoStream(messages);
  }

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
    throw new Error(`Erro na API OpenRouter (${response.status}): ${errText}`);
  }

  return response.body;
}

/**
 * Gerador de stream para simulação médica caso a OPENROUTER_API_KEY ainda não tenha sido inserida
 */
function createDemoStream(messages: ChatMessage[]) {
  const lastUserMsg = messages[messages.length - 1]?.content || "Dúvida médica";
  
  const demoText = `### 🎯 Resposta Direta & Conduta-Chave
Com base nas diretrizes médicas brasileiras (SBC/FEBRASGO/PCDT-MS) e referências internacionais de padrão-ouro, a abordagem prioritária para **${lastUserMsg.slice(0, 50)}...** baseia-se na identificação precoce e estratificação de risco imediata.

---

### 🧠 Fisiopatologia & Mecanismo
O mecanismo central envolve o desequilíbrio hemodinâmico e a resposta inflamatória tecidual. Quando ocorre a descompensação, a perda do feedback homeostático gera hipoperfusão tecidual e elevação dos biomarcadores específicos.

---

### 📋 Conduta & Propedêutica Passo a Passo
1. **Medidas Iniciais (Minuto Zero)**: Monitorização contínua (ECG, oximetria, PANI), obtenção de 2 acessos venosos calibrosos e coleta de exames direcionados.
2. **Exames Mandatórios**: Gasometria arterial com lactato, hemograma completo, eletrólitos, função renal e ECG de 12 derivações.
3. **Terapêutica de 1ª Linha**: Estabilização clínica conforme os protocolos vigentes de suporte avançado.

---

### ⚠️ Pegadinha de Prova & Distratores (Bancas USP / ENARE / ENAMED)
> **Cuidado com a casca de banana:** As bancas adoram colocar como alternativa atrativa a solicitação imediata de exames invasivos antes da estabilização hemodinâmica do paciente. Lembre-se: **Paciente instável NÃO sai da sala de emergência para tomografia!**

---

### 💡 Mnemônico / Regra de Ouro MedPleni
> **"Estabilizar ANTES de Investigar"** — Na emergência e nas provas de R1, a conduta que salva vidas e garante a questão é sempre a estabilização hemodinâmica primária.

*(Nota do Sistema: Para ativar a inferência real em tempo real com Claude 3.7 Sonnet, configure sua OPENROUTER_API_KEY no painel).*`;

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const chunks = demoText.split(" ");
      for (const word of chunks) {
        const payload = `data: ${JSON.stringify({
          choices: [{ delta: { content: word + " " } }],
        })}\n\n`;
        controller.enqueue(encoder.encode(payload));
        await new Promise((r) => setTimeout(r, 25));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return readable;
}
