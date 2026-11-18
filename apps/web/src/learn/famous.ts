/**
 * Jogos famosos, com comentários curtos da Oru. As partidas são de domínio público
 * (lances são fatos); os comentários são nossos. Tudo é conferido em `famous.test.ts`.
 * As chaves de `notes` são o número do lance: "17." para as brancas e "17..." para as pretas.
 */

export interface FamousGame {
  id: string;
  title: string;
  white: string;
  black: string;
  place: string;
  year: number;
  result: '1-0' | '0-1' | '1/2-1/2';
  /** Por que vale a pena ver, em uma frase. */
  intro: string;
  moves: string;
  notes: Record<string, string>;
}

export const FAMOUS: FamousGame[] = [
  {
    id: 'opera',
    title: 'A partida da ópera',
    white: 'Paul Morphy',
    black: 'Duque de Brunswick e Conde Isouard',
    place: 'Paris',
    year: 1858,
    result: '1-0',
    intro: 'Jogada num camarote, durante uma ópera. É a aula mais famosa de desenvolvimento rápido.',
    moves:
      '1.e4 e5 2.Nf3 d6 3.d4 Bg4 4.dxe5 Bxf3 5.Qxf3 dxe5 6.Bc4 Nf6 7.Qb3 Qe7 8.Nc3 c6 9.Bg5 b5 10.Nxb5 cxb5 11.Bxb5+ Nbd7 12.O-O-O Rd8 13.Rxd7 Rxd7 14.Rd1 Qe6 15.Bxd7+ Nxd7 16.Qb8+ Nxb8 17.Rd8#',
    notes: {
      '4...': 'As pretas trocam o bispo pelo cavalo. Ganham um peão de volta, mas ficam atrasadas: as peças brancas saem mais rápido.',
      '7.': 'A dama e o bispo atacam f7 e b7 ao mesmo tempo.',
      '10.': 'Morphy entrega o cavalo para abrir linhas contra o rei preto, que ainda está no centro.',
      '12.': 'Roque grande: a torre chega na coluna d na hora certa.',
      '13.': 'Mais uma entrega. A torre some, mas cada peça branca que sobra está trabalhando.',
      '16.': 'O sacrifício final da dama! Depois de Cxb8, a torre dá mate.',
      '17.': 'Mate com as duas últimas peças, bispo e torre. As peças pretas da ala do rei nunca entraram no jogo.',
    },
  },
  {
    id: 'legal',
    title: 'O mate de Legal',
    white: 'Kermur de Legal',
    black: 'Saint Brie',
    place: 'Paris',
    year: 1750,
    result: '1-0',
    intro: 'Uma armadilha de abertura que existe há quase 300 anos e ainda pega gente.',
    moves: '1.e4 e5 2.Bc4 d6 3.Nf3 Bg4 4.Nc3 g6 5.Nxe5 Bxd1 6.Bxf7+ Ke7 7.Nd5#',
    notes: {
      '3...': 'O bispo crava o cavalo contra a dama. Parece que o cavalo não pode se mexer...',
      '5.': 'Mas pode! As brancas largam a dama de propósito.',
      '5...': 'As pretas pegam a dama. Agora vem o castigo.',
      '7.': 'Mate com três peças menores. Uma cravada contra a dama não é uma cravada de verdade.',
    },
  },
  {
    id: 'imortal',
    title: 'A Imortal',
    white: 'Adolf Anderssen',
    black: 'Lionel Kieseritzky',
    place: 'Londres',
    year: 1851,
    result: '1-0',
    intro: 'As brancas entregam um bispo, as duas torres e a dama, e dão mate com as peças que sobraram.',
    moves:
      '1.e4 e5 2.f4 exf4 3.Bc4 Qh4+ 4.Kf1 b5 5.Bxb5 Nf6 6.Nf3 Qh6 7.d3 Nh5 8.Nh4 Qg5 9.Nf5 c6 10.g4 Nf6 11.Rg1 cxb5 12.h4 Qg6 13.h5 Qg5 14.Qf3 Ng8 15.Bxf4 Qf6 16.Nc3 Bc5 17.Nd5 Qxb2 18.Bd6 Bxg1 19.e5 Qxa1+ 20.Ke2 Na6 21.Nxg7+ Kd8 22.Qf6+ Nxf6 23.Be7#',
    notes: {
      '2.': 'Gambito do Rei: as brancas entregam um peão para abrir a coluna f e ganhar tempo.',
      '11...': 'As pretas aceitam o bispo. Material a mais, mas as peças delas estão espalhadas.',
      '17.': 'Anderssen ignora o ataque à torre e traz o cavalo para perto do rei preto.',
      '18.': 'Bd6!! Entrega a outra torre também. O bispo fecha a fuga do rei por f8.',
      '22.': 'E agora a dama! Ela sai do caminho para o bispo dar o golpe final.',
      '23.': 'Mate com bispo e dois cavalos. As pretas têm muito mais material, e nada disso ajuda.',
    },
  },
  {
    id: 'sempre-viva',
    title: 'A Sempre-Viva',
    white: 'Adolf Anderssen',
    black: 'Jean Dufresne',
    place: 'Berlim',
    year: 1852,
    result: '1-0',
    intro: 'Outra obra-prima de Anderssen, com uma combinação final de muitos lances.',
    moves:
      '1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4 Bxb4 5.c3 Ba5 6.d4 exd4 7.O-O d3 8.Qb3 Qf6 9.e5 Qg6 10.Re1 Nge7 11.Ba3 b5 12.Qxb5 Rb8 13.Qa4 Bb6 14.Nbd2 Bb7 15.Ne4 Qf5 16.Bxd3 Qh5 17.Nf6+ gxf6 18.exf6 Rg8 19.Rad1 Qxf3 20.Rxe7+ Nxe7 21.Qxd7+ Kxd7 22.Bf5+ Ke8 23.Bd7+ Kf8 24.Bxe7#',
    notes: {
      '4.': 'Gambito Evans: um peão para ganhar o centro com c3 e d4.',
      '17.': 'O cavalo se entrega para abrir a coluna e.',
      '19.': 'Rad1!! Anderssen deixa o cavalo de f3 cair e põe a última peça no ataque.',
      '20.': 'Começa a combinação: torre, dama e só então o mate.',
      '21.': 'A dama se entrega para puxar o rei para d7.',
      '22.': 'Xeque duplo: bispo e torre ao mesmo tempo. O rei tem que andar.',
      '24.': 'Mate. Repare como a torre de d1 controla a coluna toda.',
    },
  },
  {
    id: 'reti',
    title: 'Réti contra Tartakower',
    white: 'Richard Réti',
    black: 'Savielly Tartakower',
    place: 'Viena',
    year: 1910,
    result: '1-0',
    intro: 'Onze lances, um sacrifício de dama e um xeque duplo. Curta e perfeita.',
    moves: '1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Nf6 5.Qd3 e5 6.dxe5 Qa5+ 7.Bd2 Qxe5 8.O-O-O Nxe4 9.Qd8+ Kxd8 10.Bg5+ Kc7 11.Bd8#',
    notes: {
      '8.': 'O roque grande deixa o cavalo de e4 sem defesa, mas põe a torre na coluna d.',
      '8...': 'As pretas pegam o cavalo e parecem estar ganhando.',
      '9.': 'Dd8+!! A dama se entrega para levar o rei para a coluna da torre.',
      '10.': 'Xeque duplo: o bispo dá xeque e descobre a torre. Só o rei pode se mexer.',
      '11.': 'Mate. Se fosse Re8, Td8 também seria mate.',
    },
  },
  {
    id: 'moedas',
    title: 'A chuva de moedas de ouro',
    white: 'Stefan Levitsky',
    black: 'Frank Marshall',
    place: 'Breslau',
    year: 1912,
    result: '0-1',
    intro: 'Conta a lenda que o público jogou moedas de ouro no tabuleiro depois do último lance de Marshall.',
    moves:
      '1.d4 e6 2.e4 d5 3.Nc3 c5 4.Nf3 Nc6 5.exd5 exd5 6.Be2 Nf6 7.O-O Be7 8.Bg5 O-O 9.dxc5 Be6 10.Nd4 Bxc5 11.Nxe6 fxe6 12.Bg4 Qd6 13.Bh3 Rae8 14.Qd2 Bb4 15.Bxf6 Rxf6 16.Rad1 Qc5 17.Qe2 Bxc3 18.bxc3 Qxc3 19.Rxd5 Nd4 20.Qh5 Ref8 21.Re5 Rh6 22.Qg5 Rxh3 23.Rc5 Qg3',
    notes: {
      '11...': 'Com fxe6, a coluna f se abre para as torres pretas.',
      '19...': 'O cavalo pula para d4, mirando e2 e f3.',
      '22...': 'A torre pega o bispo: o roque branco fica sem proteção.',
      '23...': 'Dg3!! A dama vai para uma casa onde pode ser capturada de três jeitos, e todos perdem: hxg3 Ce2#, fxg3 Ce2+ e Txf1#, Dxg3 Ce2+ Rh1 Cxg3+ e as pretas ficam com uma peça a mais. As brancas abandonaram.',
    },
  },
  {
    id: 'seculo',
    title: 'O jogo do século',
    white: 'Donald Byrne',
    black: 'Bobby Fischer',
    place: 'Nova York',
    year: 1956,
    result: '0-1',
    intro: 'Fischer tinha 13 anos. Ele entrega a dama e ganha tanto material que o resto vira uma caçada.',
    moves:
      '1.Nf3 Nf6 2.c4 g6 3.Nc3 Bg7 4.d4 O-O 5.Bf4 d5 6.Qb3 dxc4 7.Qxc4 c6 8.e4 Nbd7 9.Rd1 Nb6 10.Qc5 Bg4 11.Bg5 Na4 12.Qa3 Nxc3 13.bxc3 Nxe4 14.Bxe7 Qb6 15.Bc4 Nxc3 16.Bc5 Rfe8+ 17.Kf1 Be6 18.Bxb6 Bxc4+ 19.Kg1 Ne2+ 20.Kf1 Nxd4+ 21.Kg1 Ne2+ 22.Kf1 Nc3+ 23.Kg1 axb6 24.Qb4 Ra4 25.Qxb6 Nxd1 26.h3 Rxa2 27.Kh2 Nxf2 28.Re1 Rxe1 29.Qd8+ Bf8 30.Nxe1 Bd5 31.Nf3 Ne4 32.Qb8 b5 33.h4 h5 34.Ne5 Kg7 35.Kg1 Bc5+ 36.Kf1 Ng3+ 37.Ke1 Bb4+ 38.Kd1 Bb3+ 39.Kc1 Ne2+ 40.Kb1 Nc3+ 41.Kc1 Rc2#',
    notes: {
      '11...': 'Ca4!! O cavalo vai para a borda, onde pode ser capturado. Fischer quer abrir o jogo contra o rei branco, que ainda não rocou.',
      '13...': 'O cavalo pega o peão central, e o rei branco continua no meio.',
      '17...': 'Be6!! Fischer deixa a dama ser capturada.',
      '18...': 'Em troca, vem um "moinho": xeques descobertos que vão pegando peça atrás de peça.',
      '25...': 'Pela dama, Fischer ficou com torre, dois bispos e cavalo: muito mais força.',
      '41...': 'Mate com torre, cavalo e bispos. Uma das partidas mais famosas da história, jogada por um menino.',
    },
  },
  {
    id: 'kasparov',
    title: 'A imortal de Kasparov',
    white: 'Garry Kasparov',
    black: 'Veselin Topalov',
    place: 'Wijk aan Zee',
    year: 1999,
    result: '1-0',
    intro: 'Um sacrifício de torre e uma caçada ao rei que atravessa o tabuleiro inteiro.',
    moves:
      '1.e4 d6 2.d4 Nf6 3.Nc3 g6 4.Be3 Bg7 5.Qd2 c6 6.f3 b5 7.Nge2 Nbd7 8.Bh6 Bxh6 9.Qxh6 Bb7 10.a3 e5 11.O-O-O Qe7 12.Kb1 a6 13.Nc1 O-O-O 14.Nb3 exd4 15.Rxd4 c5 16.Rd1 Nb6 17.g3 Kb8 18.Na5 Ba8 19.Bh3 d5 20.Qf4+ Ka7 21.Rhe1 d4 22.Nd5 Nbxd5 23.exd5 Qd6 24.Rxd4 cxd4 25.Re7+ Kb6 26.Qxd4+ Kxa5 27.b4+ Ka4 28.Qc3 Qxd5 29.Ra7 Bb7 30.Rxb7 Qc4 31.Qxf6 Kxa3 32.Qxa6+ Kxb4 33.c3+ Kxc3 34.Qa1+ Kd2 35.Qb2+ Kd1 36.Bf1 Rd2 37.Rd7 Rxd7 38.Bxc4 bxc4 39.Qxh8 Rd3 40.Qa8 c3 41.Qa4+ Ke1 42.f4 f5 43.Kc1 Rd2 44.Qa7',
    notes: {
      '13...': 'Os dois reis rocaram para o mesmo lado. Vai ser uma briga de peças.',
      '24.': 'Txd4!! Kasparov entrega a torre para abrir caminho até o rei preto.',
      '26...': 'O rei preto é empurrado para fora de casa e começa a passear.',
      '27.': 'Os peões também atacam: o rei vai sendo levado para o campo das brancas.',
      '33...': 'O rei preto já está em c3, cercado pelas peças brancas.',
      '37.': 'Td7! Um desvio: depois de Txd7, o bispo captura a dama.',
      '44.': 'A dama contra a torre decide, e as pretas abandonaram.',
    },
  },

  {
    id: 'lasker-thomas',
    title: 'A caçada ao rei',
    white: 'Edward Lasker',
    black: 'George Thomas',
    place: 'Londres',
    year: 1912,
    result: '1-0',
    intro: 'Um sacrifício de dama arrasta o rei preto de h8 até g1, do outro lado do tabuleiro.',
    moves:
      '1.d4 e6 2.Nf3 f5 3.Nc3 Nf6 4.Bg5 Be7 5.Bxf6 Bxf6 6.e4 fxe4 7.Nxe4 b6 8.Ne5 O-O 9.Bd3 Bb7 10.Qh5 Qe7 11.Qxh7+ Kxh7 12.Nxf6+ Kh6 13.Neg4+ Kg5 14.h4+ Kf4 15.g3+ Kf3 16.Be2+ Kg2 17.Rh2+ Kg1 18.Kd2#',
    notes: {
      '10.': 'A dama mira h7, defendida só pelo rei.',
      '11.': 'Dxh7+!! A dama se entrega para puxar o rei para fora de casa.',
      '12.': 'Xeque duplo, e começa a caçada.',
      '14.': 'Cada xeque empurra o rei mais um pouco para o campo das brancas.',
      '17...': 'O rei preto chegou a g1, a casa de partida do rei branco.',
      '18.': 'Mate com um lance de rei! (Rocar grande também seria mate.)',
    },
  },
  {
    id: 'steinitz',
    title: 'Steinitz contra Bardeleben',
    white: 'Wilhelm Steinitz',
    black: 'Curt von Bardeleben',
    place: 'Hastings',
    year: 1895,
    result: '1-0',
    intro: 'O primeiro campeão mundial oficial deixa a torre ser capturada por quatro lances seguidos, e ninguém consegue pegá-la.',
    moves:
      '1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d4 exd4 6.cxd4 Bb4+ 7.Nc3 d5 8.exd5 Nxd5 9.O-O Be6 10.Bg5 Be7 11.Bxd5 Bxd5 12.Nxd5 Qxd5 13.Bxe7 Nxe7 14.Re1 f6 15.Qe2 Qd7 16.Rac1 c6 17.d5 cxd5 18.Nd4 Kf7 19.Ne6 Rhc8 20.Qg4 g6 21.Ng5+ Ke8 22.Rxe7+ Kf8 23.Rf7+ Kg8 24.Rg7+ Kh8 25.Rxh7+',
    notes: {
      '17.': 'Um peão entregue para abrir caminho ao cavalo.',
      '22.': 'Txe7+! A torre entra e não pode ser capturada: se Dxe7, Txc8+ ganha uma torre; se Rxe7, Te1+ e o ataque continua.',
      '23.': 'A torre fica dando xeque. Se as pretas a pegarem, a dama de g4 entra na jogada.',
      '25.': 'Aqui Bardeleben saiu do salão sem abandonar. Steinitz mostrou depois um mate em dez lances.',
    },
  },
  {
    id: 'deep-blue',
    title: 'A máquina vence o campeão',
    white: 'Deep Blue',
    black: 'Garry Kasparov',
    place: 'Nova York',
    year: 1997,
    result: '1-0',
    intro: 'Última partida do match: pela primeira vez um computador venceu o campeão mundial num match com ritmo de torneio.',
    moves:
      '1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Nd7 5.Ng5 Ngf6 6.Bd3 e6 7.N1f3 h6 8.Nxe6 Qe7 9.O-O fxe6 10.Bg6+ Kd8 11.Bf4 b5 12.a4 Bb7 13.Re1 Nd5 14.Bg3 Kc8 15.axb5 cxb5 16.Qd3 Bc6 17.Bf5 exf5 18.Rxe7 Bxe7 19.c4',
    notes: {
      '7...': 'h6? Um lance conhecido por ser perigoso nesta abertura.',
      '8.': 'Cxe6! O cavalo se entrega e o rei preto fica preso no centro.',
      '10...': 'O rei não pode mais rocar e foge para o lado da dama.',
      '19.': 'Kasparov abandonou: as peças brancas entram por todos os lados.',
    },
  },
  {
    id: 'fischer-spassky',
    title: 'A sexta do match do século',
    white: 'Bobby Fischer',
    black: 'Boris Spassky',
    place: 'Reykjavík',
    year: 1972,
    result: '1-0',
    intro: 'Fischer, que quase sempre abria com e4, joga c4 e vence de um jeito tão bonito que o próprio Spassky aplaudiu.',
    moves:
      '1.c4 e6 2.Nf3 d5 3.d4 Nf6 4.Nc3 Be7 5.Bg5 O-O 6.e3 h6 7.Bh4 b6 8.cxd5 Nxd5 9.Bxe7 Qxe7 10.Nxd5 exd5 11.Rc1 Be6 12.Qa4 c5 13.Qa3 Rc8 14.Bb5 a6 15.dxc5 bxc5 16.O-O Ra7 17.Be2 Nd7 18.Nd4 Qf8 19.Nxe6 fxe6 20.e4 d4 21.f4 Qe7 22.e5 Rb8 23.Bc4 Kh8 24.Qh3 Nf8 25.b3 a5 26.f5 exf5 27.Rxf5 Nh7 28.Rcf1 Qd8 29.Qg3 Re7 30.h4 Rbb7 31.e6 Rbc7 32.Qe5 Qe8 33.a4 Qd8 34.R1f2 Qe8 35.R2f3 Qd8 36.Bd3 Qe8 37.Qe4 Nf6 38.Rxf6 gxf6 39.Rxf6 Kg8 40.Bc4 Kh8 41.Qf4',
    notes: {
      '1.': 'c4! Uma surpresa: Fischer quase nunca abria assim.',
      '20.': 'Os peões brancos do centro começam a andar.',
      '26.': 'f5! A coluna f se abre para as torres.',
      '31.': 'O peão de e6 corta o tabuleiro das pretas ao meio.',
      '38.': 'Txf6! A torre se entrega para abrir o rei preto.',
      '41.': 'Spassky abandonou e aplaudiu junto com o público.',
    },
  },
];

export function famousById(id: string): FamousGame | undefined {
  return FAMOUS.find((g) => g.id === id);
}

/** PGN com cabeçalho, para o leitor de PGN e para a análise. */
export function famousPgn(g: FamousGame): string {
  return [
    `[Event "${g.title}"]`,
    `[Site "${g.place}"]`,
    `[Date "${g.year}.??.??"]`,
    `[White "${g.white}"]`,
    `[Black "${g.black}"]`,
    `[Result "${g.result}"]`,
    '',
    `${g.moves} ${g.result}`,
  ].join('\n');
}

/** Chave de comentário do lance de índice `i` (0 = primeiro lance das brancas). */
export function noteKey(i: number): string {
  const n = Math.floor(i / 2) + 1;
  return i % 2 === 0 ? `${n}.` : `${n}...`;
}
