/**
 * Aulas da trilha "Aprender". Cada aula é uma lista de passos:
 * - passo de explicação: posição + texto (+ setas e círculos);
 * - passo de tarefa: o aluno joga `moves[0]`, a casa responde `moves[1]`, o aluno joga `moves[2]`...
 *   Lances em UCI. Qualquer mate também vale, e `alt` lista outros primeiros lances aceitos.
 * Todas as posições e lances são conferidos em `lessons.test.ts`.
 */

export type Arrow = [string, string] | [string, string, 'red' | 'blue' | 'green' | 'yellow'];

export interface LessonStep {
  fen: string;
  text: string;
  /** Tarefa: lances em UCI, começando pelo do aluno. */
  moves?: string[];
  /** Outros primeiros lances que também resolvem. */
  alt?: string[];
  /** Mensagem quando acerta. */
  done?: string;
  arrows?: Arrow[];
  circles?: string[];
}

export interface Lesson {
  id: string;
  title: string;
  sub: string;
  group: string;
  /** Livros de referência em que a aula se apoia (obrigatório: veja docs/REFERENCIAS.md). */
  ref: string;
  steps: LessonStep[];
}

export const GROUPS = ['Primeiros passos', 'Táticas', 'Mates', 'Abertura e final'] as const;

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const LESSONS: Lesson[] = [
  // ---------------- Primeiros passos ----------------
  {
    id: 'objetivo',
    title: 'O objetivo do jogo',
    sub: 'Xeque-mate',
    group: 'Primeiros passos',
    ref: "Leis do Xadrez da FIDE, art. 1; Fischer, Margulies e Mosenfelder, Bobby Fischer Teaches Chess (1966), cap. 'Elements of Checkmate'",
    steps: [
      {
        fen: START,
        text: 'O xadrez tem 64 casas e 16 peças para cada lado. As brancas sempre começam, e cada um joga uma vez.',
      },
      {
        fen: 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3',
        text: 'O objetivo é o xeque-mate: atacar o rei de um jeito que ele não consiga escapar. Aqui a dama preta deu mate no rei branco.',
        arrows: [['h4', 'e1', 'red']],
      },
      {
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
        text: 'Sua vez! A dama e o bispo miram a mesma casa. Dê o xeque-mate em um lance.',
        moves: ['h5f7'],
        done: 'Mate! O rei preto não tem para onde ir, e ninguém pode capturar a dama, que está protegida pelo bispo.',
        arrows: [['c4', 'f7', 'yellow']],
      },
    ],
  },
  {
    id: 'torre-bispo',
    title: 'A torre e o bispo',
    sub: 'Linhas retas e diagonais',
    group: 'Primeiros passos',
    ref: "Leis do Xadrez da FIDE, art. 3; Capablanca, Chess Fundamentals (1921), cap. I",
    steps: [
      {
        fen: '7k/8/8/8/3R4/8/8/K7 w - - 0 1',
        text: 'A torre anda em linha reta, na vertical ou na horizontal, quantas casas quiser. Ela não pula outras peças.',
        arrows: [['d4', 'd8'], ['d4', 'd1'], ['d4', 'a4'], ['d4', 'h4']],
      },
      {
        fen: '7k/8/8/3p4/8/8/8/K2R4 w - - 0 1',
        text: 'Capture o peão com a torre. Capturar é ir até a casa da peça adversária: ela sai do jogo.',
        moves: ['d1d5'],
        done: 'Isso! A torre subiu pela coluna e capturou o peão.',
      },
      {
        fen: '8/7k/8/8/3B4/8/8/4K3 w - - 0 1',
        text: 'O bispo anda na diagonal, quantas casas quiser. Repare: ele nunca troca de cor de casa.',
        arrows: [['d4', 'a7'], ['d4', 'g7'], ['d4', 'a1'], ['d4', 'g1']],
      },
      {
        fen: '8/7k/8/5n2/8/8/8/1B2K3 w - - 0 1',
        text: 'Capture o cavalo com o bispo.',
        moves: ['b1f5'],
        done: 'Perfeito, uma diagonal inteira de uma vez.',
      },
    ],
  },
  {
    id: 'dama-rei',
    title: 'A dama e o rei',
    sub: 'A mais forte e a mais importante',
    group: 'Primeiros passos',
    ref: "Leis do Xadrez da FIDE, art. 3",
    steps: [
      {
        fen: '8/7k/8/8/3Q4/8/8/4K3 w - - 0 1',
        text: 'A dama junta a torre e o bispo: anda em linha reta e na diagonal. É a peça mais forte do jogo.',
        arrows: [['d4', 'd8'], ['d4', 'h4'], ['d4', 'a4'], ['d4', 'd1'], ['d4', 'a7'], ['d4', 'g7'], ['d4', 'a1'], ['d4', 'g1']],
      },
      {
        fen: 'r6k/8/8/8/8/8/Q7/4K3 w - - 0 1',
        text: 'A torre preta está atacando sua dama. Capture-a primeiro!',
        moves: ['a2a8'],
        done: 'Boa! Quem ataca primeiro, às vezes, leva.',
      },
      {
        fen: '7k/8/8/8/3K4/8/8/8 w - - 0 1',
        text: 'O rei anda só uma casa, para qualquer lado. E nunca pode ir para uma casa atacada pelo adversário.',
        circles: ['c3', 'c4', 'c5', 'd3', 'd5', 'e3', 'e4', 'e5'],
      },
      {
        fen: '7k/8/8/8/3Kp3/8/8/8 w - - 0 1',
        text: 'Esse peão está sozinho, sem ninguém para protegê-lo. Capture-o com o rei.',
        moves: ['d4e4'],
        done: 'Isso. O rei também ataca, mas com cuidado.',
      },
    ],
  },
  {
    id: 'cavalo',
    title: 'O cavalo',
    sub: 'O lance em L',
    group: 'Primeiros passos',
    ref: "Leis do Xadrez da FIDE, art. 3",
    steps: [
      {
        fen: '7k/8/8/8/3N4/8/8/4K3 w - - 0 1',
        text: 'O cavalo anda em L: duas casas para um lado e uma para o outro. É a única peça que pula por cima das outras.',
        circles: ['b3', 'b5', 'c2', 'c6', 'e2', 'e6', 'f3', 'f5'],
      },
      {
        fen: '7k/8/2r5/8/3N4/8/8/4K3 w - - 0 1',
        text: 'Capture a torre com o cavalo.',
        moves: ['d4c6'],
        done: 'Um cavalo por uma torre: ótimo negócio.',
      },
    ],
  },
  {
    id: 'peao',
    title: 'O peão',
    sub: 'Pequeno, mas promove',
    group: 'Primeiros passos',
    ref: "Leis do Xadrez da FIDE, art. 3.7 (promoção); Capablanca, Chess Fundamentals (1921), cap. I §2 (promoção do peão)",
    steps: [
      {
        fen: START,
        text: 'O peão anda uma casa para a frente. No primeiro lance dele, pode andar duas. E nunca volta.',
        arrows: [['e2', 'e4'], ['d2', 'd3']],
      },
      {
        fen: '7k/8/8/3p1n2/4P3/8/8/4K3 w - - 0 1',
        text: 'Mas ele captura na diagonal, uma casa à frente. Aqui o peão branco pode capturar o peão ou o cavalo. Capture o que vale mais!',
        moves: ['e4f5'],
        done: 'Isso: o cavalo vale bem mais que um peão.',
      },
      {
        fen: '7k/4P3/8/8/8/8/8/4K3 w - - 0 1',
        text: 'Quando o peão chega à última fileira, ele vira outra peça, quase sempre uma dama. Promova o peão!',
        moves: ['e7e8q'],
        done: 'Uma dama nova, e ainda dando xeque.',
      },
    ],
  },
  {
    id: 'valor',
    title: 'Quanto vale cada peça',
    sub: 'Trocas boas e ruins',
    group: 'Primeiros passos',
    ref: "Seirawan, Play Winning Chess (1990), cap. 2 'Force' (escala 1-3-3-5-9); Capablanca, Chess Fundamentals (1921), cap. I §5",
    steps: [
      {
        fen: START,
        text: 'Para decidir trocas, conte pontos: peão 1, cavalo 3, bispo 3, torre 5, dama 9, a escala usada por Seirawan em Play Winning Chess. O rei não tem preço. Capablanca lembra que não existe tabela exata: o bispo costuma valer um pouco mais que o cavalo, e uma torre vale mais ou menos uma peça menor e dois peões.',
      },
      {
        fen: '6k1/5ppp/8/1r6/4p3/2N5/8/6K1 w - - 0 1',
        text: 'Seu cavalo pode capturar um peão ou uma torre. Qual captura vale mais?',
        moves: ['c3b5'],
        done: 'Torre vale 5, peão vale 1. Sempre confira o que dá para capturar.',
      },
    ],
  },
  {
    id: 'xeque',
    title: 'Xeque e como sair dele',
    sub: 'Fugir, bloquear ou capturar',
    group: 'Primeiros passos',
    ref: "Leis do Xadrez da FIDE, art. 3.9",
    steps: [
      {
        fen: '4k3/8/8/8/8/8/8/4R1K1 b - - 0 1',
        text: 'Xeque é quando o rei é atacado. Sair do xeque é obrigatório, e há três jeitos: fugir, bloquear ou capturar quem deu o xeque.',
        arrows: [['e1', 'e8', 'red']],
      },
      {
        fen: '6k1/8/8/8/8/8/5PP1/r6K w - - 0 1',
        text: 'A torre deu xeque no seu rei. Fuja para uma casa segura.',
        moves: ['h1h2'],
        done: 'Fugiu! h2 não está atacada.',
      },
      {
        fen: '6k1/8/8/8/8/8/3N1PPP/r5K1 w - - 0 1',
        text: 'Agora o rei não tem para onde fugir. Bloqueie o xeque, colocando uma peça no caminho.',
        moves: ['d2f1'],
        alt: ['d2b1'],
        done: 'Bloqueou. O cavalo fica na frente do rei.',
      },
      {
        fen: '6k1/8/8/8/3B4/8/5PPP/r5K1 w - - 0 1',
        text: 'E aqui? Capture a peça que deu o xeque.',
        moves: ['d4a1'],
        done: 'Capturou! Muitas vezes é a melhor saída.',
      },
    ],
  },
  {
    id: 'especiais',
    title: 'Roque, en passant e empate',
    sub: 'Os lances especiais',
    group: 'Primeiros passos',
    ref: "Leis do Xadrez da FIDE, art. 3.8.2 (roque), 3.7.4 (en passant), art. 5 e 9 (empates)",
    steps: [
      {
        fen: 'r3k2r/pppq1ppp/2npbn2/2b1p3/2B1P3/2NPBN2/PPPQ1PPP/R3K2R w KQkq - 0 1',
        text: 'O roque: o rei anda duas casas para o lado de uma torre, e a torre pula para o outro lado dele. Protege o rei e ativa a torre.',
        arrows: [['e1', 'g1'], ['h1', 'f1']],
      },
      {
        fen: 'r3k2r/pppq1ppp/2npbn2/2b1p3/2B1P3/2NPBN2/PPPQ1PPP/R3K2R w KQkq - 0 1',
        text: 'Faça o roque pequeno: arraste o rei duas casas para a direita.',
        moves: ['e1g1'],
        done: 'Rei seguro! Lembre: não dá para rocar se o rei ou a torre já se mexeram, se o rei estiver em xeque ou se ele passar por casa atacada.',
      },
      {
        fen: '7k/8/8/3pP3/8/8/8/4K3 w - d6 0 1',
        text: 'O peão preto acabou de andar duas casas e parou ao lado do seu. Você pode capturá-lo como se ele tivesse andado só uma: é o en passant. Só vale logo em seguida.',
        moves: ['e5d6'],
        arrows: [['d7', 'd5', 'red']],
        done: 'En passant! O peão preto saiu do tabuleiro.',
      },
      {
        fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',
        text: 'Afogamento: as pretas têm a vez, não estão em xeque, mas não têm nenhum lance. É empate! Cuidado com isso quando estiver ganhando.',
        circles: ['g8', 'g7', 'h7'],
      },
      {
        fen: '7k/8/6K1/5Q2/8/8/8/8 w - - 0 1',
        text: 'Dê o mate em um lance, sem afogar o rei preto.',
        moves: ['f5f8'],
        done: 'Mate! Repare que Df7 seria afogamento.',
      },
      {
        fen: '8/8/4k3/8/8/4K3/8/8 w - - 0 1',
        text: 'Também é empate quando ninguém tem peças para dar mate (rei contra rei), quando a mesma posição se repete três vezes, ou quando os dois combinam.',
      },
    ],
  },

  // ---------------- Táticas ----------------
  {
    id: 'garfo',
    title: 'Garfo',
    sub: 'Um ataque, dois alvos',
    group: 'Táticas',
    ref: "Seirawan, Winning Chess Tactics, cap. 2 'The Double Attack'",
    steps: [
      {
        fen: '2q3k1/5ppp/8/3N4/8/8/5PPP/6K1 w - - 0 1',
        text: 'Garfo é quando uma peça ataca duas ao mesmo tempo. O adversário só consegue salvar uma. O cavalo é o rei dos garfos.',
      },
      {
        fen: '2q3k1/5ppp/8/3N4/8/8/5PPP/6K1 w - - 0 1',
        text: 'Ache o garfo: dê xeque no rei e ataque a dama ao mesmo tempo.',
        moves: ['d5e7', 'g8h8', 'e7c8'],
        done: 'O rei teve que sair, e a dama caiu.',
      },
    ],
  },
  {
    id: 'cravada',
    title: 'Cravada',
    sub: 'Preso na frente do rei',
    group: 'Táticas',
    ref: "Seirawan, Winning Chess Tactics, cap. 3 'The Pin'",
    steps: [
      {
        fen: '4k3/pp3ppp/2n5/8/8/8/PP3PPP/4KB2 w - - 0 1',
        text: 'Na cravada, uma peça fica presa: se sair da frente, deixa uma peça mais valiosa atacada atrás dela. Se atrás for o rei, ela nem pode se mexer.',
      },
      {
        fen: '4k3/pp3ppp/2n5/8/8/8/PP3PPP/4KB2 w - - 0 1',
        text: 'Crave o cavalo preto contra o rei.',
        moves: ['f1b5'],
        done: 'Cravado! Agora o cavalo não pode sair de c6.',
      },
    ],
  },
  {
    id: 'espeto',
    title: 'Espeto',
    sub: 'A cravada ao contrário',
    group: 'Táticas',
    ref: "Seirawan, Winning Chess Tactics, cap. 4 'The Skewer'",
    steps: [
      {
        fen: '8/8/B7/3k4/8/8/2K5/7q w - - 0 1',
        text: 'No espeto, a peça mais valiosa está na frente. Quando ela sai do ataque, a de trás fica exposta. Rei e dama estão na mesma diagonal...',
        arrows: [['d5', 'h1', 'yellow']],
      },
      {
        fen: '8/8/B7/3k4/8/8/2K5/7q w - - 0 1',
        text: 'Dê xeque com o bispo na diagonal do rei e da dama.',
        moves: ['a6b7', 'd5d4', 'b7h1'],
        done: 'O rei saiu do xeque, e o bispo pegou a dama.',
      },
    ],
  },
  {
    id: 'descoberto',
    title: 'Ataque descoberto',
    sub: 'A peça que sai revela outra',
    group: 'Táticas',
    ref: "Seirawan, Winning Chess Tactics (xeque descoberto)",
    steps: [
      {
        fen: 'q3k3/8/8/8/4B3/8/8/4R1K1 w - - 0 1',
        text: 'Seu bispo está na frente da torre. Quando ele sair, a torre dá xeque no rei. Isso é um ataque descoberto: o bispo fica livre para pegar o que quiser.',
        arrows: [['e1', 'e8', 'red']],
      },
      {
        fen: 'q3k3/8/8/8/4B3/8/8/4R1K1 w - - 0 1',
        text: 'Use o xeque descoberto para ganhar a dama.',
        moves: ['e4a8'],
        done: 'Dama capturada com xeque! As pretas nem têm tempo de reagir.',
      },
    ],
  },

  {
    id: 'xeque-duplo',
    title: 'Xeque duplo',
    sub: 'Duas peças dão xeque juntas',
    group: 'Táticas',
    ref: "Edward Lasker, Chess Strategy (1915), partida 35 (Réti x Tartakower); Seirawan, Winning Chess Tactics (xeque duplo)",
    steps: [
      {
        fen: 'rnbk1b1r/pp3ppp/2p5/4q3/4n3/8/PPPB1PPP/2KR1BNR w - - 0 10',
        text: 'No xeque duplo, duas peças atacam o rei ao mesmo tempo. Não dá para bloquear nem capturar as duas: o rei é obrigado a andar.',
        arrows: [['d1', 'd8', 'red']],
      },
      {
        fen: 'rnbk1b1r/pp3ppp/2p5/4q3/4n3/8/PPPB1PPP/2KR1BNR w - - 0 10',
        text: 'Esta é a posição de Réti contra Tartakower (1910). Mova o bispo, dando xeque com ele e com a torre ao mesmo tempo. Depois, dê o mate.',
        moves: ['d2g5', 'd8c7', 'g5d8'],
        done: 'Xeque duplo e depois mate com o bispo. Réti tinha acabado de entregar a dama.',
      },
    ],
  },
  {
    id: 'desvio',
    title: 'Desvio',
    sub: 'Tire o defensor do lugar',
    group: 'Táticas',
    ref: "Seirawan, Winning Chess Tactics, cap. 6 'Deflection'; Sergeant, Morphy's Games of Chess (1957), pp. 149-150",
    steps: [
      {
        fen: '4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 16',
        text: 'Às vezes uma peça só está defendendo uma casa importante. Se você forçar essa peça a sair, a casa fica livre. Aqui o cavalo de d7 é a única defesa de d8.',
        arrows: [['d1', 'd8', 'yellow']],
        circles: ['d7'],
      },
      {
        fen: '4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 16',
        text: 'A partida da ópera, de Morphy (1858). Entregue a dama para desviar o cavalo e dê mate.',
        moves: ['b3b8', 'd7b8', 'd1d8'],
        done: 'O cavalo saiu de d7 para pegar a dama, e a torre deu mate. Uma das combinações mais famosas da história.',
      },
    ],
  },

  // ---------------- Mates ----------------
  {
    id: 'corredor',
    title: 'Mate do corredor',
    sub: 'Os peões viram uma prisão',
    group: 'Mates',
    ref: "Fischer, Margulies e Mosenfelder, Bobby Fischer Teaches Chess (1966), cap. 'The Back-Rank Mates'",
    steps: [
      {
        fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
        text: 'O rei preto está atrás dos próprios peões, sem casa para fugir. Dê o mate na última fileira.',
        moves: ['d1d8'],
        done: 'Mate do corredor! Por isso é bom abrir uma "janela" para o rei (como h6).',
      },
      {
        fen: '2r3k1/5ppp/8/8/8/8/5PPP/2RR2K1 w - - 0 1',
        text: 'Agora a torre preta defende a última fileira. Elimine o defensor... e veja o que acontece.',
        moves: ['c1c8'],
        done: 'Mate! Capturar a torre já foi o próprio mate.',
      },
    ],
  },
  {
    id: 'mate-dama',
    title: 'Mate com dama e rei',
    sub: 'O rei ajuda a dama',
    group: 'Mates',
    ref: "Capablanca, Chess Fundamentals (1921), cap. I §1 'Some Simple Mates'",
    steps: [
      {
        fen: '7k/8/6K1/8/8/8/8/1Q6 w - - 0 1',
        text: 'Com o rei preto no canto, o seu rei tira as casas de fuga e a dama dá o mate. Dê mate em um lance.',
        moves: ['b1b8'],
        done: 'Mate! O rei branco cuida de g7 e h7.',
      },
      {
        fen: '4k3/8/4K3/8/8/8/8/7Q w - - 0 1',
        text: 'Agora com o rei preto na borda. Mate em um.',
        moves: ['h1h8'],
        done: 'Mate na borda: a dama segura a fileira e o rei branco segura as casas da frente.',
      },
    ],
  },
  {
    id: 'escada',
    title: 'Mate da escada',
    sub: 'Duas torres, um degrau por vez',
    group: 'Mates',
    ref: "Capablanca, Chess Fundamentals (1921), cap. I §1 (o princípio de levar o rei até a borda)",
    steps: [
      {
        fen: '8/8/8/8/3k4/6R1/8/K6R w - - 0 1',
        text: 'Com duas torres é fácil: uma corta a fileira, a outra dá xeque e empurra o rei. Vá alternando, subindo um degrau por vez, até a borda.',
        arrows: [['g3', 'a3', 'blue'], ['h1', 'h4']],
      },
      {
        fen: '8/8/8/8/3k4/6R1/8/K6R w - - 0 1',
        text: 'Comece: xeque com a torre de h1 na 4ª fileira. Depois continue alternando as torres até o mate.',
        moves: ['h1h4', 'd4c5', 'g3g5', 'c5c6', 'h4h6', 'c6c7', 'g5g7', 'c7d8', 'h6h8'],
        done: 'Mate da escada! Funciona em qualquer borda.',
      },
    ],
  },

  {
    id: 'mate-sufocado',
    title: 'Mate sufocado',
    sub: 'O rei preso pelas próprias peças',
    group: 'Mates',
    ref: "Hooper e Whyld, The Oxford Companion to Chess (2ª ed., 1992), verbete 'Philidor's legacy'",
    steps: [
      {
        fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1',
        text: 'Quando o rei está cercado pelas próprias peças, um cavalo sozinho pode dar mate. Dê o mate!',
        moves: ['g5f7'],
        done: 'Mate sufocado: o rei não tem casa nenhuma, e ninguém alcança o cavalo.',
      },
      {
        fen: '5r1k/6pp/8/3Q2N1/8/8/8/6K1 w - - 0 1',
        text: 'Agora o famoso mate de Philidor: xeque com o cavalo, xeque duplo, sacrifício da dama em g8 e o cavalo volta para o mate. Comece com xeque.',
        moves: ['g5f7', 'h8g8', 'f7h6', 'g8h8', 'd5g8', 'f8g8', 'h6f7'],
        done: 'Perfeito! A dama obrigou a torre a tampar g8, e o cavalo deu o mate.',
      },
    ],
  },
  {
    id: 'mate-torre',
    title: 'Mate com torre e rei',
    sub: 'O rei ajuda a torre na borda',
    group: 'Mates',
    ref: "Capablanca, Chess Fundamentals (1921), cap. I §1 'Some Simple Mates', exemplo 1",
    steps: [
      {
        fen: '8/8/8/8/8/5K2/R7/5k2 w - - 0 1',
        text: 'Com uma torre só também dá mate, mas o rei tem que ajudar: ele fica de frente para o rei adversário, e a torre ataca a fileira da borda. Dê o mate.',
        moves: ['a2a1'],
        done: 'Mate! Seu rei tirou as casas da frente, e a torre fechou a borda.',
      },
      {
        fen: '8/8/8/8/8/5K2/R7/5k2 w - - 0 1',
        text: 'Para chegar até aqui, use a torre como uma cerca: ela corta o rei adversário numa parte do tabuleiro, e o seu rei vai empurrando, sempre de frente para ele, até a borda.',
        arrows: [['f3', 'f2', 'green']],
      },
    ],
  },

  // ---------------- Abertura e final ----------------
  {
    id: 'abertura',
    title: 'Como começar a partida',
    sub: 'Centro, desenvolvimento, roque',
    group: 'Abertura e final',
    ref: "Capablanca, Chess Fundamentals (1921), cap. I §6 'General Strategy of the Opening' e §7 'Control of the Centre'",
    steps: [
      {
        fen: START,
        text: 'As quatro casas do meio (d4, e4, d5, e5) são as mais importantes. Peças no centro alcançam mais casas.',
        circles: ['d4', 'e4', 'd5', 'e5'],
      },
      {
        fen: START,
        text: 'Comece ocupando o centro com um peão.',
        moves: ['e2e4'],
        alt: ['d2d4'],
        done: 'Ótimo começo. Agora o bispo e a dama já podem sair.',
      },
      {
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        text: 'Desenvolva um cavalo atacando o peão do centro.',
        moves: ['g1f3'],
        done: 'Cavalo desenvolvido e atacando.',
      },
      {
        fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        text: 'Os conselhos de Capablanca: desenvolva as peças rápido, tire os cavalos antes dos bispos, não mexa a mesma peça duas vezes antes de terminar o desenvolvimento e dispute o centro, porque sem controlar o centro nenhum ataque forte dá certo.',
        arrows: [['e1', 'g1']],
      },
    ],
  },
  {
    id: 'bispo-italiana',
    title: 'Abertura italiana',
    sub: 'Um plano clássico para começar',
    group: 'Abertura e final',
    ref: "Capablanca, Chess Fundamentals (1921), cap. I §6, e parte II, partida 13 (Ruy López)",
    steps: [
      {
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        text: 'Depois de 1.e4 e5 2.Cf3 Cc6, o bispo de f1 tem duas casas boas: c4 (abertura italiana), mirando f7, ou b5 (abertura espanhola), pressionando o cavalo que defende e5.',
        arrows: [['f1', 'c4'], ['f1', 'b5']],
      },
      {
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        text: 'Leve o bispo para c4, mirando a casa mais fraca das pretas.',
        moves: ['f1c4'],
        alt: ['f1b5'],
        done: 'Bispo ativo! O próximo passo é o roque, e depois c3 e d4 para disputar o centro.',
        arrows: [['c4', 'f7', 'yellow']],
      },
    ],
  },
  {
    id: 'pastor',
    title: 'Mate do pastor',
    sub: 'Dar e se defender',
    group: 'Abertura e final',
    ref: "Capablanca, Chess Fundamentals (1921), cap. I §8 'Traps' (armadilhas de abertura)",
    steps: [
      {
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
        text: 'Você está de pretas. A dama e o bispo brancos miram f7, a casa mais fraca no começo. Defenda!',
        moves: ['g7g6'],
        alt: ['d8e7', 'd8f6'],
        arrows: [['h5', 'f7', 'red'], ['c4', 'f7', 'red']],
        done: 'Defendido. Com g6 a dama branca ainda leva um chute.',
      },
      {
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
        text: 'Agora as pretas esqueceram de defender. Dê o mate!',
        moves: ['h5f7'],
        done: 'O mate do pastor. Rápido contra quem não presta atenção, mas fácil de defender.',
      },
    ],
  },
  {
    id: 'quadrado',
    title: 'A regra do quadrado',
    sub: 'O rei alcança o peão?',
    group: 'Abertura e final',
    ref: "Dvoretsky, Dvoretsky's Endgame Manual (2003), cap. 1 'The Rule of the Square'",
    steps: [
      {
        fen: '8/8/8/5k2/P7/8/8/7K b - - 0 1',
        text: 'Imagine um quadrado do peão até a casa de promoção. Se o rei consegue entrar nele, alcança o peão.',
        circles: ['a4', 'a8', 'e8', 'e4'],
        arrows: [['a4', 'a8', 'yellow'], ['a8', 'e8', 'yellow'], ['e8', 'e4', 'yellow'], ['e4', 'a4', 'yellow']],
      },
      {
        fen: '8/8/8/5k2/P7/8/8/7K b - - 0 1',
        text: 'Você está de pretas. Entre no quadrado para pegar o peão.',
        moves: ['f5e5'],
        alt: ['f5e4', 'f5e6'],
        done: 'Dentro do quadrado! Agora é só seguir o peão: Rd6, Rc7, Rb7 e ele cai. Empate.',
      },
    ],
  },

  {
    id: 'oposicao',
    title: 'Oposição',
    sub: 'Rei contra rei',
    group: 'Abertura e final',
    ref: "Capablanca, Chess Fundamentals (1921), cap. II §13 'The Opposition'; Dvoretsky, Dvoretsky's Endgame Manual (2003), cap. 1",
    steps: [
      {
        fen: '8/8/4k3/8/4K3/8/4P3/8 b - - 1 1',
        text: 'Reis frente a frente, com uma casa entre eles: isso é a oposição. Quem tem que jogar precisa ceder caminho. Aqui as pretas têm a vez e vão ter que deixar o rei branco passar.',
        circles: ['e5'],
      },
      {
        fen: '8/8/4k3/8/8/4K3/4P3/8 w - - 0 1',
        text: 'Com rei e peão contra rei, o rei vai na frente do peão. Tome a oposição: coloque seu rei de frente para o rei preto, com uma casa entre eles.',
        moves: ['e3e4'],
        done: 'Oposição! As pretas têm que sair da frente, o rei branco avança e abre caminho para o peão.',
      },
    ],
  },
];

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

// ---------- Progresso (no aparelho) ----------

const KEY = 'checkoru.aulas';

export function doneLessons(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

export function saveDoneLessons(ids: string[], sync = true): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids.filter((id) => LESSONS.some((l) => l.id === id))));
  } catch {
    /* ignora */
  }
  if (sync) void import('../training').then((t) => t.pushTraining());
}

export function markLessonDone(id: string): void {
  saveDoneLessons([...doneLessons(), id]);
}
