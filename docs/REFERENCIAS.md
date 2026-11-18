# Livros de referência

**Regra do projeto:** todo conteúdo de xadrez do Checkoru (aulas, comentários de partidas, explicações da Oru,
valores de peças, princípios de abertura e de final, e também os métodos técnicos, como o anti-trapaça) se apoia
em livros de referência, e a fonte fica citada junto do conteúdo:

- cada aula tem o campo `ref` em `apps/web/src/learn/lessons.ts`;
- cada jogo famoso tem o campo `sources` em `apps/web/src/learn/famous.ts`;
- o app mostra a fonte embaixo do tabuleiro;
- o teste `learn.test.ts` falha se faltar a referência.

Antes de citar, confira que o livro realmente trata do assunto (sumário, edição, página quando der). Na dúvida, não
cite. Prefira obras em domínio público (Capablanca, Edward Lasker), que podem ser conferidas por qualquer pessoa.
Os textos do app são escritos por nós, com nossas palavras; não copiamos trechos dos livros.

## Regras e fundamentos

- **Leis do Xadrez da FIDE** (versão em vigor desde 1º/1/2023). Art. 1 (objetivo), art. 3 (movimento das peças;
  3.7.4 en passant, 3.8.2 roque, 3.9 xeque), art. 5 e 9 (fim da partida e empates).
- **José Raúl Capablanca, *Chess Fundamentals*** (1921; edição revista de 1934). Domínio público:
  [Projeto Gutenberg nº 33870](https://www.gutenberg.org/ebooks/33870).
  Cap. I: §1 mates simples (rei e torre, rei e dama), §2 promoção do peão, §5 valor relativo das peças,
  §6 estratégia geral da abertura, §7 controle do centro, §8 armadilhas. Cap. II: §13 a oposição.
  Parte II: partidas comentadas (a 13 é uma Ruy López).
- **Yasser Seirawan, *Play Winning Chess*** (1990). Cap. 2 ("Force"): escala de valores 1-3-3-5-9.

## Táticas e mates

- **Yasser Seirawan (com Jeremy Silman), *Winning Chess Tactics*** (ed. revista). Cap. 2 ataque duplo (garfo),
  cap. 3 cravada, cap. 4 espeto, cap. 6 desvio; xeque descoberto e xeque duplo ao longo do livro.
- **Bobby Fischer, Stuart Margulies e Donn Mosenfelder, *Bobby Fischer Teaches Chess*** (1966).
  Capítulos "Elements of Checkmate" e "The Back-Rank Mates".
- **David Hooper e Kenneth Whyld, *The Oxford Companion to Chess*** (1984; 2ª ed. 1992). Verbetes
  "Philidor's legacy" (mate sufocado) e "Légal".

## Finais

- **Mark Dvoretsky, *Dvoretsky's Endgame Manual*** (2003). Cap. 1 (finais de peões): oposição e regra do quadrado.

## Partidas

- **Graham Burgess, John Nunn e John Emms, *The Mammoth Book of the World's Greatest Chess Games*** (3ª ed., 2010).
  Partidas 2 (Anderssen x Kieseritzky, a Imortal), 3 (Anderssen x Dufresne, a Sempre-Viva), 6 (Steinitz x
  von Bardeleben), 38 (D. Byrne x Fischer), 64 (Fischer x Spassky, 6ª do match de 1972) e 105 (Kasparov x Topalov).
- **Edward Lasker, *Chess Strategy*** (1915). Domínio público:
  [Projeto Gutenberg nº 5614](https://www.gutenberg.org/ebooks/5614). Partida 35: Réti x Tartakower.
- **Irving Chernev, *Logical Chess: Move by Move*** (1957). Réti x Tartakower na introdução.
- **Philip W. Sergeant, *Morphy's Games of Chess*** (Dover, 1957), pp. 149-150; **Garry Kasparov,
  *My Great Predecessors*, parte I** (2003), pp. 39-40: a partida da ópera.
- **George Walker, *A Selection of Games at Chess*** (1835), p. 91: Légal x Saint Brie (com vantagem de torre).
- **Frank Marshall, *Marshall's Chess "Swindles"*** (1914), pp. 61-62, e ***My Fifty Years of Chess*** (1942),
  p. 138: Levitsky x Marshall, com a história das moedas de ouro (contestada; veja Edward Winter, *Chess Notes*,
  "Marshall's 'Gold Coins' Game").
- **Edward Lasker, *Chess for Fun & Chess for Blood*** (1942) e ***Chess Secrets I Learned from the Masters***
  (1951): Lasker x Thomas. A ordem dos lances da abertura varia entre as fontes; veja Edward Winter, *Chess Notes*,
  "Chaos in a Miniature".
- **Feng-hsiung Hsu, *Behind Deep Blue*** (2002) e **Garry Kasparov e Mig Greengard, *Deep Thinking*** (2017):
  Deep Blue x Kasparov, 6ª partida de 1997.

## Métodos de treino

- **Revisão espaçada:** algoritmo SM-2, de Piotr Woźniak (SuperMemo, 1987), descrito em P. A. Woźniak,
  *Optimization of learning*, dissertação de mestrado, Universidade de Tecnologia de Poznań, 1990
  (republicado em supermemo.com como "Application of a computer to improve the results obtained in working with the
  SuperMemo method"). Implementação em `apps/web/src/srs.ts`, seguindo o texto: intervalos 1, 6 e depois × EF;
  EF começa em 2,5, nunca abaixo de 1,3; resposta com nota abaixo de 3 recomeça sem mudar o EF.
- **Memória de posição:** inspirada nos experimentos de reconstrução de posições de **Adriaan de Groot,
  *Thought and Choice in Chess*** (1965). O app não afirma resultados do livro; só usa a ideia do exercício.
- **Nomes de aberturas:** banco [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings)
  (domínio público / CC0), com a classificação ECO (*Encyclopaedia of Chess Openings*, Šahovski Informator).
  Gerado por `scripts/openings/build.py`.

## Puzzles

Os puzzles vêm do banco aberto do Lichess (CC0), de partidas reais, com solução conferida por motor. Não há livro
por trás de cada puzzle; os temas (garfo, cravada etc.) seguem os nomes usados nas obras acima.
