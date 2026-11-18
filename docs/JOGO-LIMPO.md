# Jogo limpo: como o Checkoru procura ajuda de motor

Este método é público de propósito: quem joga tem o direito de saber como é analisado. O código está em
`apps/server/src/fairplay.ts` (estatística) e `apps/server/scripts/fairplay.ts` (análise com o motor), e roda toda
semana no GitHub Actions (`.github/workflows/jogo-limpo.yml`), sem custo.

## O que é analisado

- Só partidas **valendo rating** da última semana (até 400 por rodada).
- Cada posição vai para o Stockfish (profundidade 12). Ele dá o melhor lance e a avaliação.
- Só contam **lances com escolha**. Ficam de fora:
  - os 8 primeiros lances de cada lado, que é a teoria de abertura;
  - as posições com um único lance legal;
  - as posições já decididas, com avaliação acima de 3 peões para qualquer lado.

## A conta

Para cada jogador:

1. **Coincidência:** quantos lances com escolha foram exatamente o primeiro lance do motor.
2. **Esperado:** a taxa de coincidência dos outros jogadores do Checkoru na mesma faixa de 200 pontos de rating,
   sem contar o próprio jogador. Se a faixa tiver poucos lances, usa todos os outros jogadores.
3. **Escore z:** (coincidências − lances × esperado) / √(lances × esperado × (1 − esperado)). É o número de
   desvios-padrão acima do normal.
4. Também mostramos a **perda média** em centipeões. É só informativa.

Com menos de 60 lances com escolha, não tiramos conclusão nenhuma.

## Limiares

| z | O que acontece |
| --- | --- |
| abaixo de 2,5 | nada |
| de 2,5 a 4,25 | aparece no relatório como "de olho", sem registro na conta |
| 4,25 ou mais | vira um **sinal para revisão humana** (tabela `fair_play_flags`) |

Os números vêm das regras de jogo limpo da FIDE. O limiar para xadrez online é 4,25. Um z de 2,5 ou mais só serve
para apoiar outras provas.

**Ninguém é punido pelo número sozinho.** Uma pessoa revisa as partidas, o histórico e o contexto antes de qualquer
medida, e quem for acusado pode se explicar.

## Limites (com honestidade)

- **Não é o modelo de Kenneth Regan**, que é o aprovado pela FIDE. O modelo dele calibra a expectativa por rating
  com milhões de lances de partidas de mestres e combina três testes. O nosso só se inspira na ideia do teste de
  coincidência e usa como referência os próprios jogadores do Checkoru.
- Com poucos jogadores, a referência da faixa é fraca, e o resultado também.
- A profundidade 12 é modesta. Um jogador forte pode coincidir muito com o motor sem ajuda nenhuma.
- Quem usa o motor só em alguns lances pode não aparecer.

## Fontes

- K. W. Regan e G. McC. Haworth, "Intrinsic Chess Ratings", *Proceedings of the AAAI Conference on Artificial
  Intelligence* 25 (2011), pp. 834-839, doi:10.1609/aaai.v25i1.7951.
- FIDE, *Anti-Cheating / Fair Play Regulations* (FIDE Handbook): presunção por escore z, limiar de 4,25 para online
  e 2,5 como apoio a outras provas.
- K. W. Regan, "Statistics and Analytics in Chess" (palestra no Congresso da FIDE, 2013): o escore z isolado só
  indica trapaça com valores muito altos (z > 5).
