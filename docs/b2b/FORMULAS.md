# MedPleni B2B — Especificação Psicométrica e Fórmulas de Avaliação

**Documento Técnico para Revisão Médica e Pedagógica**  
**Revisores:** Dr. Filipe Moreira de Andrade e Dr. Bruno Farnetano  
**Data:** 19/11/2026 · **Versão:** 1.0  
**Referência do Sistema:** `docs/b2b/ESPEC-B2B.md` (Seções 0, 4.2 e 6) · Funções **PR-09** e **QB-12**  
**Código-fonte de implementação pura:** `platform/lib/b2b/psychometrics.ts` e `platform/lib/b2b/psychometrics-config.ts`

---

## 1. Notação Geral e Convenções da Plataforma

- $n$: Número total de alunos com tentativa de prova **finalizada** na aplicação ($status = \text{"finalizada"}$). Alunos ausentes não entram no cálculo psicométrico dos itens.
- $k$: Número de questões **válidas** da prova. Questões anuladas por recurso ou decisão docente são sumariamente desconsideradas de $k$, do cômputo da nota total dos alunos e do coeficiente de consistência da prova.
- $X_j$: Nota bruta (número total de acertos em itens válidos) do aluno $j \in \{1, \dots, n\}$.
- $y_{ji} \in \{0, 1\}$: Resposta do aluno $j$ na questão $i$, onde $1$ indica acerto do gabarito oficial e $0$ indica erro ou resposta em branco/nula.
- $X_{j, -i} = X_j - y_{ji}$: Nota total do aluno $j$ nas demais questões válidas da avaliação, **excluindo a questão $i$**.

---

## 2. Fórmulas Psicométricas por Questão e por Prova

### 2.1 Índice de Facilidade ($p$)

Representa a proporção de estudantes que assinalaram corretamente o item em relação ao total de alunos que concluíram a prova.

$$p_i = \frac{\sum_{j=1}^n y_{ji}}{n} = \frac{\text{Acertos}_i}{n}$$

- **Domínio:** $0{,}0000 \le p_i \le 1{,}0000$ (ou $0\%$ a $100\%$).
- **Interpretação Pedagógica:**
  - $p > 0{,}90$: Item **muito fácil**. Praticamente todos acertam; contribuição nula para diferenciar proficiências.
  - $0{,}60 \le p \le 0{,}90$: Item **fácil a adequado**.
  - $0{,}40 \le p < 0{,}60$: Item de **dificuldade média** (faixa ideal de discriminação psicométrica).
  - $0{,}20 \le p < 0{,}40$: Item **difícil**.
  - $p < 0{,}20$: Item **muito difícil**. Menos de 1 em 5 alunos acerta; exige conferência de clareza ou adequação curricular.

---

### 2.2 Índice de Discriminação ($D$) pelos Grupos Extremos de 27%

Mede a capacidade do item de diferenciar os estudantes de maior proficiência daqueles de menor proficiência na avaliação. Utiliza a clássica técnica dos grupos superior e inferior proposta por Kelley (1939):

1. Ordenam-se os $n$ alunos em ordem decrescente de nota total $X$.
2. Define-se o tamanho de cada grupo extremo: $n_{27} = \max\big(1, \text{round}(0{,}27 \times n)\big)$.
3. Grupo Superior ($U$): os $n_{27}$ alunos com as maiores notas na prova.
4. Grupo Inferior ($L$): os $n_{27}$ alunos com as menores notas na prova.

$$p_{\text{sup}, i} = \frac{\sum_{j \in U} y_{ji}}{n_{27}}, \quad p_{\text{inf}, i} = \frac{\sum_{j \in L} y_{ji}}{n_{27}}$$

$$D_i = p_{\text{sup}, i} - p_{\text{inf}, i}$$

- **Domínio:** $-1{,}0000 \le D_i \le +1{,}0000$.
- **Critério de Amostra Mínima:** Exige $n \ge 10$. Para $n < 10$, $D_i$ retorna nulo (`null`) por insuficiência amostral.
- **Interpretação (Ebel & Frisbie, 1991):**
  - $D \ge 0{,}40$: **Excelente discriminação**. Item de alta qualidade.
  - $0{,}30 \le D < 0{,}40$: **Boa discriminação**. Item aceitável.
  - $0{,}20 \le D < 0{,}30$: **Discriminação limítrofe**. Sugere refinamento.
  - $D < 0{,}20$: **Discriminação fraca**. O item não separa os alunos proficientes dos não proficientes.
  - $D < 0$: **Discriminação negativa (crítico)**. Alunos de menor desempenho geral acertaram mais do que os de alto desempenho (indicativo de ambiguidade, pegadinha involuntária ou erro de gabarito).

---

### 2.3 Correlação Ponto-Bisserial Corrigida ($r_{\text{pbis}}$)

A correlação ponto-bisserial é a correlação produto-momento de Pearson entre uma variável dicotômica ($y_{ji} \in \{0, 1\}$) e uma variável contínua/discreta ($X_{j}$).  
**Ajuste Crítico (Correção contra Falsa Inflação):** Quando se correlaciona o item com a nota total da prova que contém o próprio item, ocorre uma sobrestimação artificial (auto-correlação do item com ele mesmo). Por isso, a MedPleni calcula a **Ponto-Bisserial Corrigida**, correlacionando o acerto no item com a nota obtida **nas demais questões da prova** ($X_{j, -i} = X_j - y_{ji}$):

$$r_i = \frac{\sum_{j=1}^n (y_{ji} - \bar{y}_i)(X_{j, -i} - \bar{X}_{-i})}{\sqrt{\sum_{j=1}^n (y_{ji} - \bar{y}_i)^2 \cdot \sum_{j=1}^n (X_{j, -i} - \bar{X}_{-i})^2}}$$

Onde:
- $\bar{y}_i = p_i$ (média de acertos no item $i$).
- $\bar{X}_{-i} = \frac{1}{n}\sum_{j=1}^n X_{j, -i}$ (média dos alunos nas outras questões válidas).
- $\sum_{j=1}^n (y_{ji} - \bar{y}_i)^2 = n \cdot p_i (1 - p_i)$.

- **Casos de Indefinição Matemática (Zero Variance):**
  - Se todos acertam ($p = 1$) ou todos erram ($p = 0$), a variância do item é zero $\implies r_i = \text{null}$.
  - Se todos os alunos tiraram exatamente a mesma nota nas outras questões, a variância do restante é zero $\implies r_i = \text{null}$.
  - Se $n < 10$ ou $k < 2 \implies r_i = \text{null}$.
- **Interpretação:**
  - $r \ge 0{,}30$: Excelente aderência e coerência interna.
  - $0{,}20 \le r < 0{,}30$: Discriminação aceitável.
  - $0 \le r < 0{,}20$: **Sinal de Discriminação Baixa**.
  - $r < 0$: **Sinal de Discriminação Negativa**.

---

### 2.4 Coeficiente KR-20 (Kuder-Richardson Fórmula 20)

Mede a **consistência interna** da prova (fidedignidade para itens dicotômicos de acerto/erro, equivalente ao Alfa de Cronbach para escalas dicotômicas).

$$\text{KR-20} = \frac{k}{k - 1} \times \left(1 - \frac{\sum_{i=1}^k p_i (1 - p_i)}{\sigma_X^2}\right)$$

Onde:
- $k$: Número de questões válidas ($k \ge 2$).
- $p_i$: Índice de facilidade da questão válida $i$.
- $\sigma_X^2$: **Variância populacional do total de acertos** dos alunos nas questões válidas:
  $$\sigma_X^2 = \frac{1}{n} \sum_{j=1}^n (X_j - \bar{X})^2$$

- **Leitura em Uma Frase:**
  - $\text{KR-20} \ge 0{,}80$: *"Excelente consistência interna da prova. Itens coesos e alta confiabilidade na medição."*
  - $0{,}70 \le \text{KR-20} < 0{,}80$: *"Boa consistência interna, adequada para exames somativos e tomada de decisão."*
  - $0{,}60 \le \text{KR-20} < 0{,}70$: *"Consistência interna moderada, aceitável para avaliações formativas e diagnósticas."*
  - $\text{KR-20} < 0{,}60$: *"Baixa consistência interna. A prova apresenta alta dispersão ou baixa correlação entre itens."*
  - `null`: *"Amostra insuficiente ($n < 10$) ou variância nula para cálculo da consistência interna."*

---

### 2.5 Regras de Sinais e Alertas por Item (Flags)

| Sinal | Condição Matemática | Cor / Severidade | Significado Clínico-Pedagógico |
| :--- | :--- | :--- | :--- |
| **Muito fácil** | $p > 0{,}90$ | Azul (Informativo) | Quase todos acertaram. Não discrimina proficiência. |
| **Muito difícil** | $p < 0{,}20$ | Amarelo (Atenção) | Menos de 20% de acerto. Verificar complexidade ou enunciado. |
| **Discriminação baixa** | $0{,}00 \le r < 0{,}20$ | Laranja (Alerta) | O item correlaciona fracamente com o restante da prova. |
| **Discriminação negativa** | $r < 0{,}00$ | Vermelho (Crítico) | Alunos mais fracos acertam mais que os fortes. Risco de erro de gabarito. |
| **Distrator dominante** | $\exists \text{distrator } j: \text{Freq}(j) > \text{Freq}(\text{Gabarito})$ | Roxo (Pedagógico) | Uma alternativa incorreta foi mais assinalada que a correta. |

---

## 3. Exemplo Numérico Resolvido Passo a Passo (Cálculo à Mão)

Abaixo apresentamos o conjunto exato de dados utilizado nos testes unitários automatizados da plataforma (`lib/b2b/__tests__/psychometrics.test.ts`), resolvido com cada operação aritmética explícita.

### 3.1 Parâmetros Iniciais
- $n = 10$ alunos ($S_1$ a $S_{10}$)
- $k = 4$ questões de múltipla escolha ($Q_1, Q_2, Q_3, Q_4$)
- Gabaritos: $Q_1 = \text{A}$, $Q_2 = \text{B}$, $Q_3 = \text{C}$, $Q_4 = \text{D}$

### 3.2 Matriz de Respostas e Acertos Dicotômicos

| Aluno | $Q_1$ | $Q_2$ | $Q_3$ | $Q_4$ | Nota Total ($X_j$) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| $S_1$ | 1 | 1 | 1 | 1 | **4** |
| $S_2$ | 1 | 1 | 1 | 1 | **4** |
| $S_3$ | 1 | 1 | 1 | 0 | **3** |
| $S_4$ | 1 | 1 | 0 | 1 | **3** |
| $S_5$ | 1 | 0 | 1 | 1 | **3** |
| $S_6$ | 0 | 1 | 1 | 0 | **2** |
| $S_7$ | 1 | 0 | 0 | 1 | **2** |
| $S_8$ | 0 | 1 | 0 | 0 | **1** |
| $S_9$ | 0 | 0 | 1 | 0 | **1** |
| $S_{10}$ | 0 | 0 | 0 | 0 | **0** |
| **Acertos** | **6** | **6** | **6** | **5** | $\sum X = \mathbf{23}$ |

---

### 3.3 Passo 1: Média e Variância Populacional ($\sigma_X^2$)

1. **Média da Prova ($\bar{X}$):**
   $$\bar{X} = \frac{23}{10} = 2{,}3$$

2. **Diferenças em Relação à Média $(X_j - \bar{X})$ e Quadrados $(X_j - \bar{X})^2$:**
   - $S_1, S_2$ (nota 4): $(4 - 2{,}3)^2 = (1{,}7)^2 = 2{,}89$
   - $S_3, S_4, S_5$ (nota 3): $(3 - 2{,}3)^2 = (0{,}7)^2 = 0{,}49$
   - $S_6, S_7$ (nota 2): $(2 - 2{,}3)^2 = (-0{,}3)^2 = 0{,}09$
   - $S_8, S_9$ (nota 1): $(1 - 2{,}3)^2 = (-1{,}3)^2 = 1{,}69$
   - $S_{10}$ (nota 0): $(0 - 2{,}3)^2 = (-2{,}3)^2 = 5{,}29$

3. **Soma dos Quadrados:**
   $$\sum (X_j - \bar{X})^2 = 2{,}89 + 2{,}89 + 0{,}49 + 0{,}49 + 0{,}49 + 0{,}09 + 0{,}09 + 1{,}69 + 1{,}69 + 5{,}29 = 16{,}10$$

4. **Variância Populacional ($\sigma_X^2$):**
   $$\sigma_X^2 = \frac{16{,}10}{10} = \mathbf{1{,}6100}$$

---

### 3.4 Passo 2: Índices de Facilidade ($p$) e Termo $\sum p_i (1 - p_i)$

- **$Q_1$:** $p_1 = 6 / 10 = \mathbf{0{,}60} \implies p_1(1 - p_1) = 0{,}60 \times 0{,}40 = \mathbf{0{,}24}$
- **$Q_2$:** $p_2 = 6 / 10 = \mathbf{0{,}60} \implies p_2(1 - p_2) = 0{,}60 \times 0{,}40 = \mathbf{0{,}24}$
- **$Q_3$:** $p_3 = 6 / 10 = \mathbf{0{,}60} \implies p_3(1 - p_3) = 0{,}60 \times 0{,}40 = \mathbf{0{,}24}$
- **$Q_4$:** $p_4 = 5 / 10 = \mathbf{0{,}50} \implies p_4(1 - p_4) = 0{,}50 \times 0{,}50 = \mathbf{0{,}25}$

$$\sum_{i=1}^4 p_i(1 - p_i) = 0{,}24 + 0{,}24 + 0{,}24 + 0{,}25 = \mathbf{0{,}9700}$$

---

### 3.5 Passo 3: Cálculo do KR-20 da Prova

Com $k = 4$ e $\sigma_X^2 = 1{,}6100$:

$$\text{KR-20} = \frac{k}{k - 1} \times \left(1 - \frac{\sum p_i(1 - p_i)}{\sigma_X^2}\right)$$

$$\frac{k}{k - 1} = \frac{4}{3} \approx 1{,}3333333333$$

$$\frac{\sum p_i(1 - p_i)}{\sigma_X^2} = \frac{0{,}97}{1{,}61} \approx 0{,}602484472$$

$$1 - 0{,}602484472 = 0{,}397515528$$

$$\text{KR-20} = \frac{4}{3} \times 0{,}397515528 = \mathbf{0{,}5300}$$

---

### 3.6 Passo 4: Discriminação ($D$) pelos Grupos de 27%

Com $n = 10$: $n_{27} = \text{round}(0{,}27 \times 10) = \mathbf{3 \text{ alunos}}$.
- **Grupo Superior (Top 3):** $S_1$ (nota 4), $S_2$ (nota 4), $S_3$ (nota 3).
- **Grupo Inferior (Bottom 3):** $S_8$ (nota 1), $S_9$ (nota 1), $S_{10}$ (nota 0).

1. **Para $Q_1$:**
   - Acertos no Top 3: $S_1 (1), S_2 (1), S_3 (1) \implies 3/3 = 1{,}00$
   - Acertos no Bottom 3: $S_8 (0), S_9 (0), S_{10} (0) \implies 0/3 = 0{,}00$
   - $$D_1 = 1{,}00 - 0{,}00 = \mathbf{1{,}0000}$$

2. **Para $Q_2$:**
   - Acertos no Top 3: $S_1 (1), S_2 (1), S_3 (1) \implies 3/3 = 1{,}00$
   - Acertos no Bottom 3: $S_8 (1), S_9 (0), S_{10} (0) \implies 1/3 = 0{,}3333$
   - $$D_2 = 1{,}00 - 0{,}3333 = \mathbf{0{,}6667}$$

3. **Para $Q_3$:**
   - Acertos no Top 3: $S_1 (1), S_2 (1), S_3 (1) \implies 3/3 = 1{,}00$
   - Acertos no Bottom 3: $S_8 (0), S_9 (1), S_{10} (0) \implies 1/3 = 0{,}3333$
   - $$D_3 = 1{,}00 - 0{,}3333 = \mathbf{0{,}6667}$$

4. **Para $Q_4$:**
   - Acertos no Top 3: $S_1 (1), S_2 (1), S_3 (0) \implies 2/3 = 0{,}6667$
   - Acertos no Bottom 3: $S_8 (0), S_9 (0), S_{10} (0) \implies 0/3 = 0{,}00$
   - $$D_4 = 0{,}6667 - 0{,}00 = \mathbf{0{,}6667}$$

---

### 3.7 Passo 5: Ponto-Bisserial Corrigida ($r$) da Questão $Q_1$

Vetor de acertos em $Q_1$: $y_1 = [1, 1, 1, 1, 1, 0, 1, 0, 0, 0]$, com média $\bar{y}_1 = 0{,}60$.  
Vetor das notas sem $Q_1$: $X_{-1} = X - y_1$:

$$X_{-1} = [3, 3, 2, 2, 2, 2, 1, 1, 1, 0]$$

1. **Média de $X_{-1}$ ($\bar{X}_{-1}$):**
   $$\bar{X}_{-1} = \frac{3 + 3 + 2 + 2 + 2 + 2 + 1 + 1 + 1 + 0}{10} = \frac{17}{10} = \mathbf{1{,}70}$$

2. **Desvios e Somas de Quadrados:**
   - Para $y_1$:
     - Se $y=1$ (6 alunos): $1 - 0{,}6 = +0{,}4 \implies (0{,}4)^2 = 0{,}16 \times 6 = 0{,}96$
     - Se $y=0$ (4 alunos): $0 - 0{,}6 = -0{,}6 \implies (-0{,}6)^2 = 0{,}36 \times 4 = 1{,}44$
     - $$\sum (y_{j1} - \bar{y}_1)^2 = 0{,}96 + 1{,}44 = \mathbf{2{,}40}$$
   - Para $X_{-1}$:
     - $S_1, S_2$ (3): $(3 - 1{,}7)^2 = 1{,}3^2 = 1{,}69 \times 2 = 3{,}38$
     - $S_3, S_4, S_5, S_6$ (2): $(2 - 1{,}7)^2 = 0{,}3^2 = 0{,}09 \times 4 = 0{,}36$
     - $S_7, S_8, S_9$ (1): $(1 - 1{,}7)^2 = (-0{,}7)^2 = 0{,}49 \times 3 = 1{,}47$
     - $S_{10}$ (0): $(0 - 1{,}7)^2 = (-1{,}7)^2 = 2{,}89$
     - $$\sum (X_{j, -1} - \bar{X}_{-1})^2 = 3{,}38 + 0{,}36 + 1{,}47 + 2{,}89 = \mathbf{8{,}10}$$

3. **Soma dos Produtos Cruzados (Covariância $\times n$):**
   - $S_1$: $(+0{,}4) \times (+1{,}3) = +0{,}52$
   - $S_2$: $(+0{,}4) \times (+1{,}3) = +0{,}52$
   - $S_3$: $(+0{,}4) \times (+0{,}3) = +0{,}12$
   - $S_4$: $(+0{,}4) \times (+0{,}3) = +0{,}12$
   - $S_5$: $(+0{,}4) \times (+0{,}3) = +0{,}12$
   - $S_6$: $(-0{,}6) \times (+0{,}3) = -0{,}18$
   - $S_7$: $(+0{,}4) \times (-0{,}7) = -0{,}28$
   - $S_8$: $(-0{,}6) \times (-0{,}7) = +0{,}42$
   - $S_9$: $(-0{,}6) \times (-0{,}7) = +0{,}42$
   - $S_{10}$: $(-0{,}6) \times (-1{,}7) = +1{,}02$
   - **Total:** $0{,}52 + 0{,}52 + 0{,}12 + 0{,}12 + 0{,}12 - 0{,}18 - 0{,}28 + 0{,}42 + 0{,}42 + 1{,}02 = \mathbf{2{,}80}$

4. **Denominador:**
   $$\sqrt{2{,}40 \times 8{,}10} = \sqrt{19{,}44} \approx 4{,}409081537$$

5. **Correlação Ponto-Bisserial Corrigida ($r_1$):**
   $$r_1 = \frac{2{,}80}{4{,}409081537} = \mathbf{0{,}6351}$$

*(Resultado 100% idêntico ao produzido pelo algoritmo automatizado da plataforma).*

---

## 4. Referências Bibliográficas

1. **Kelley, T. L. (1939).** *The selection of upper and lower groups for the validation of test items.* Journal of Educational Psychology, 30(1), 17–24.
2. **Kuder, G. F., & Richardson, M. W. (1937).** *The theory of the estimation of test reliability.* Psychometrika, 2(3), 151–160.
3. **Ebel, R. L., & Frisbie, D. A. (1991).** *Essentials of Educational Measurement* (5th ed.). Prentice-Hall.
4. **Crocker, L., & Algina, J. (1986).** *Introduction to Classical and Modern Test Theory.* Holt, Rinehart and Winston.
5. **Nunnally, J. C., & Bernstein, I. H. (1994).** *Psychometric Theory* (3rd ed.). McGraw-Hill.
6. **INEP / Ministério da Educação (2020).** *Guia de Elaboração e Revisão de Itens do Banco Nacional de Itens (BNI).* Brasília: INEP.
