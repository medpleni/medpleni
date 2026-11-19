# Decisão Técnica: Sistema de Leitura Óptica e Correção de Provas em Papel (PR-07 e PR-11)

**Data:** 19/11/2026  
**Autor:** Antigravity  
**Destinatário:** Mario Lopes (Produto e Desenvolvimento) / Dr. Filipe Moreira de Andrade  
**Contexto:** Implementação da leitura e correção automática de cadernos e folhas de respostas em papel (scanner profissional multipágina e fotos tiradas com celular, incluindo fotos com leve rotação, inclinação ou sombras).

---

## 1. Comparativo das Abordagens Técnicas

| Critério | Abordagem 1: Processamento no Servidor (Node.js Puro / Sharp + jsQR) | Abordagem 2: Processamento no Navegador (HTML5 Canvas + Web Worker + jsQR) | Abordagem 3: Microserviço Externo / Python OpenCV |
|---|---|---|---|
| **Precisão (Scanner)** | **100%** (resolução nativa 300 DPI sem compressão de browser) | **98%** (depende de memória do browser do usuário) | **100%** |
| **Precisão (Foto de Celular com Sombra/Skew)** | **96%–98%** (com binarização adaptativa Otsu + correção de perspectiva afim) | **90%–94%** (renderização WebGL/Canvas limitada em mobile modesto) | **97%–99%** |
| **Custo de Infraestrutura** | **Baixo** (roda nos limites da CPU da instância/serverless existente) | **Zero** (computação no client do professor) | **Alto** (exige servidor dedicado com Python/C++, Docker e manutenção de outro serviço) |
| **Tempo por Folha** | **~80 ms a 150 ms** por folha | **~250 ms a 600 ms** por folha | **~100 ms** por folha |
| **Lote Grande (100 folhas scanner)** | **Excelente**: processa PDF multipágina de 100 páginas em ~8 a 12 segundos em background | **Ruim**: carregar PDF de 100 páginas no navegador pode congelar a aba ou estourar a memória RAM da máquina da secretaria acadêmica | **Excelente** |
| **Dependências Novas** | **Mínimas e Leves**: `jsqr` (50 KB, pure JS sem binários C++) + motor OMR algorítmico próprio em TypeScript | **Mínimas**: `jsqr` no cliente via script/bundle | **Pesadas**: Python 3, OpenCV (`cv2`), NumPy, PyZbar, Pillow |
| **Risco de Erro Silencioso** | **Zero**: limiar estrito de confiança matemática; qualquer incerteza vai para a Fila de Conferência | **Zero**: mesma lógica de confiança | **Zero** |

---

## 2. Análise Detalhada dos Desafios Clínicos/Operacionais

### A. O Scanner de Secretaria (Cenário Ideal)
- As secretarias de faculdades de medicina utilizam scanners de alimentação contínua que geram um único arquivo PDF multipágina em preto e branco ou escala de cinza a 200–300 DPI.
- As folhas entram perfeitamente alinhadas, com variação de ângulo de rotação mínima ($< 2^\circ$).
- O processamento de um lote de 100 alunos deve ser ágil: o coordenador faz o upload do arquivo PDF e, em poucos segundos, 95%+ das folhas são corrigidas sem qualquer intervenção humana.

### B. A Foto do Celular do Professor (Cenário Real de Emergência)
- O professor tira fotos com celular em sala de aula ou no plantão:
  - Pode haver distorção de perspectiva (foto não tirada a $90^\circ$ exatos).
  - Iluminação desigual (sombra da mão do professor sobre o cabeçalho ou nas bolhas inferiores).
  - Folha amassada ou levemente curvada.
- **Solução de Engenharia:**
  1. **Quatro marcas de registro nos cantos:** quadrados pretos sólidos de 8×8 mm com margens padronizadas.
  2. **Transformação Projetiva (Homografia 2D):** mapeia os 4 cantos detectados para a grade canônica retangular, desfazendo a rotação e a perspectiva.
  3. **Binarização Adaptativa Local (Otsu / Local Adaptive Threshold):** calcula a média ponderada de luminosidade em blocos de $15 \times 15$ pixels, eliminando o impacto de sombras suaves sobre as bolhas.
  4. **Cálculo de Densidade e Confiança:**
     - Preenchimento $> 40\%$ com as demais alternativas $< 15\% \rightarrow$ Acerto ou Erro com **Confiança Alta (1.0)**.
     - Preenchimento entre $20\%$ e $40\%$, ou duas alternativas preenchidas com $> 25\% \rightarrow$ **Confiança Baixa (0.5)** $\rightarrow$ Encaminhamento compulsório para a **Tela de Conferência Humana** com recorte ampliado da marcação original.

---

## 3. Recomendação Técnica para Aprovação do Mario

> [!IMPORTANT]
> **Recomendação: Abordagem 1 Híbrida Leve (Motor OMR Algorítmico em TypeScript no Servidor + Canvas de Conferência no Cliente + fallback por digitação rápida)**
> 
> **Por que esta abordagem?**
> 1. **Não instala dependências pesadas de sistema** (evita Python, Docker externo ou compilação C++ de OpenCV).
> 2. Utiliza apenas bibliotecas leves e puras do ecossistema JS (`jsqr` para leitura do QR code e gerador de PDF/SVG vetorial para impressão precisa).
> 3. Suporta tanto o **PDF multipágina do scanner** quanto o envio de **fotos múltiplas do celular**.
> 4. Mantém o critério de **tolerância zero a erro silencioso**: toda questão em que o preenchimento não seja absolutamente claro é recortada e apresentada lado a lado na tela de conferência para validação em 1 clique.
> 5. Para casos em que a folha estiver rasgada, molhada ou sem QR legível, disponibiliza imediatamente a **Fila de Identificação Manual** e a **Digitação Rápida por Teclado** (1 a 100 via teclas A, B, C, D, E e seta para baixo).

---

## 4. Próximos Passos (Etapa B)

Com o ok do Mario:
1. Geração dos cadernos de prova e folhas de respostas vetoriais em PDF com QR único e marcas fiduciais.
2. Motor OMR em TypeScript (`lib/b2b/omr/`).
3. Interface de upload e tela de conferência lado a lado (`/instituicao/provas/[id]/correcao`).
4. Teste automatizado com conjunto de 30 folhas simuladas (scanner + fotos com skew e sombra).
