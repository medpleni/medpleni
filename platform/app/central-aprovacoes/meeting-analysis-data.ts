// Síntese Analítica da Reunião de 05/11/2026
// Extraído de medpleni-b2b-validacao-funcional.html

export interface DecisaoExplicita {
  decisao: string;
  quemQuando: string;
  impacto: string;
}

export interface PontoExigeDecisao {
  ponto: string;
  fala: string;
  ondeValidar: string;
}

export const DECISOES_EXPLICITAS: DecisaoExplicita[] = [
  {
    "decisao": "Três formatos de aplicação e correção de prova: 100% papel com correção automática por foto do gabarito e QR code único por aluno; híbrido (prova no papel, gabarito online por link/código); 100% online.",
    "quemQuando": "Filipe pediu (00:33–00:36); Mario propôs os três; Bruno confirmou extração de alternativas",
    "impacto": "Novas funções PR-11, PR-12; ajustar PR-05 e PR-13. Leitura óptica deixa de ser \"integração\" e vira funcionalidade."
  },
  {
    "decisao": "Competências alinhadas às diretrizes INEP/MEC, com taxonomia editável para acompanhar mudanças futuras.",
    "quemQuando": "Filipe (00:40–00:41); Filipe envia o material; Mario atualiza",
    "impacto": "Substituir as 14 competências geradas por IA (QB-16); reflete em intervenções, provas, programática e aluno."
  },
  {
    "decisao": "Banco de questões via IA, de forma legal: treinar a IA com o material de padronização do INEP/MEC; gerar questões originais a partir das devolutivas; reescrever os ~5.000 itens de terceiros (método já usado por Mario no preparatório IBCLC).",
    "quemQuando": "Filipe (00:42–00:46); Mario (00:47–00:50); \"talvez seja o melhor caminho\" (Bruno)",
    "impacto": "Novos motores QB-13 e QB-14; ajustar Motor B (QB-08), direitos de uso (QB-10) e simulador (QB-11)."
  },
  {
    "decisao": "Protótipo validou o direcionamento geral (B2B, visões por stakeholder, intervenções, programática, régua de 3 etapas).",
    "quemQuando": "Filipe (00:08–00:28); Renato já havia concordado com o posicionamento",
    "impacto": "Entra agora a fase \"isso sai, isso entra\" — esta ferramenta."
  }
];

export const PONTOS_EXIGEM_DECISAO: PontoExigeDecisao[] = [
  {
    "ponto": "Nome e escopo da \"Avaliação programática\" — Filipe: o espírito está certo, mas programática inclui outros tipos de prova (prática); sugeriu \"avaliação programática teórica\".",
    "fala": "00:27–00:28",
    "ondeValidar": "AP-01, AP-05"
  },
  {
    "ponto": "1ª etapa do ENAMED (4º semestre) provavelmente cobra ciclo básico (anatomia etc.), não medicina clínica — \"vamos aguardar o governo\"; cursinhos não estão preparados.",
    "fala": "00:28–00:31",
    "ondeValidar": "RE-02"
  },
  {
    "ponto": "Preparo no 4º e 8º período como diferencial de mercado e argumento de marketing — \"ainda não existe\".",
    "fala": "00:28–00:30",
    "ondeValidar": "RE-01"
  },
  {
    "ponto": "Ticket variável pelo número de alunos (\"proteção de marca\"); sem valores.",
    "fala": "00:31–00:32",
    "ondeValidar": "CO-01"
  },
  {
    "ponto": "Vender plataforma com acervo MedPleni ou vazia (faculdade constrói o próprio banco) — \"oferecer as duas opções\".",
    "fala": "00:40",
    "ondeValidar": "CO-02, QB-15, PR-15"
  },
  {
    "ponto": "MedPleni (os médicos) sugerir provas prontas por mês para a instituição.",
    "fala": "00:33",
    "ondeValidar": "PR-14"
  },
  {
    "ponto": "Disponibilizar todas as 35 mil questões para cada instituição ou um subconjunto — \"vocês dizem o que faz sentido para o mercado\".",
    "fala": "00:18–00:19",
    "ondeValidar": "QB-15"
  },
  {
    "ponto": "KPIs principais do dirigente — \"vocês vão dizer quais são os mais importantes\".",
    "fala": "00:09–00:10",
    "ondeValidar": "EX-01"
  },
  {
    "ponto": "White label para instituições — \"não bateu o martelo\".",
    "fala": "00:53",
    "ondeValidar": "TR-03"
  },
  {
    "ponto": "Discriminação e facilidade: Filipe pediu a definição; vale exibir na interface.",
    "fala": "00:16–00:17",
    "ondeValidar": "PR-09"
  }
];

export const OBSERVACOES_LEITURA: string[] = [
  "O acervo dos médicos (30–35 mil) muda a estratégia do banco: o problema deixa de ser \"chegar a 12 mil\" e passa a ser classificar, reescrever o que é de terceiros e padronizar. O simulador de capacidade precisa de um cenário novo em que a revisão humana é amostral sobre itens já validados em sala.",
  "A correção por foto do gabarito foi o pedido mais enfático da reunião (\"faz muita diferença\") e vem de dor concreta (1.000 provas em papel). É candidata a entrar no piloto, acima de várias funções já demonstradas.",
  "A fala de Filipe sobre o 4º semestre cobrar ciclo básico implica que a 1ª etapa pode exigir um banco e uma taxonomia de ciências básicas — hoje inexistentes no acervo e no protótipo. É um risco de escopo a decidir cedo.",
  "O método \"devolutiva → questão\" e a reescrita de itens de terceiros resolvem o conflito ético/jurídico levantado pelos próprios médicos, mas a política precisa ficar escrita (proveniência rastreável, item de origem nunca publicado)."
];
