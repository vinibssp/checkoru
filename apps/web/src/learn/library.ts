/**
 * Biblioteca de clássicos em domínio público, traduzidos para o português e com os exemplos no tabuleiro.
 *
 * Capablanca, *Chess Fundamentals* (1921; texto da edição revista de 1934), Project Gutenberg nº 33870
 * (espelho oficial: github.com/GITenberg/Chess-Fundamentals_33870). Domínio público nos EUA; no Brasil, a obra
 * está em domínio público desde 2013 (Lei 9.610/98, art. 41: 70 anos após a morte do autor, em 1942).
 * Tradução do Checkoru, feita direto do texto em inglês. O livro usa a notação descritiva da época; aqui os lances
 * estão em notação algébrica (R rei, D dama, T torre, B bispo, C cavalo). As posições iniciais foram copiadas dos
 * diagramas do livro (imagens Fig1 a Fig10 da edição do Gutenberg). Tudo é conferido em `learn.test.ts`.
 */
import type { FamousGame } from './famous';

export type Block = { kind: 'p'; text: string } | { kind: 'h'; text: string } | { kind: 'ex'; id: string };

export interface BookSection {
  id: string;
  number: number;
  title: string;
  blocks: Block[];
}

export interface BookChapter {
  id: string;
  title: string;
  intro: string;
  sections: BookSection[];
}

export interface Book {
  id: string;
  title: string;
  original: string;
  author: string;
  year: number;
  source: string;
  rights: string;
  chapters: BookChapter[];
}

const cf = (sec: string) => `Capablanca, Chess Fundamentals (1921), cap. I, ${sec} (Project Gutenberg nº 33870)`;
const CF = cf("§1 'Some Simple Mates'");
const CF2 = cf("§2 'Pawn Promotion'");
const CF3 = cf("§3 'Pawn Endings'");

const ex = (g: Omit<FamousGame, 'place' | 'year' | 'result' | 'sources' | 'white' | 'black'> & Partial<Pick<FamousGame, 'white' | 'black' | 'result' | 'sources'>>): FamousGame => ({
  white: 'Brancas',
  black: 'Pretas',
  place: 'Fundamentos do Xadrez',
  year: 1921,
  result: '1-0',
  sources: [CF],
  ...g,
});

export const LIBRARY_EXAMPLES: FamousGame[] = [
  ex({
    id: 'capablanca-1',
    title: 'Exemplo 1: torre e rei contra rei',
    fen: '7k/8/8/8/8/8/8/R6K w - - 0 1',
    intro: 'O princípio é empurrar o rei adversário para a última linha de qualquer lado do tabuleiro.',
    moves: '1.Ra7 Kg8 2.Kg2 Kf8 3.Kf3 Ke8 4.Ke4 Kd8 5.Kd5 Kc8 6.Kd6 Kb8 7.Rc7 Ka8 8.Kc6 Kb8 9.Kb6 Ka8 10.Rc8#',
    notes: {
      '1.': 'O poder da torre aparece logo no primeiro lance: ela prende o rei preto na última fileira.',
      '2.': 'Rei e torre precisam agir juntos. Mantenha o seu rei, tanto quanto possível, na mesma fileira ou coluna que o rei adversário.',
      '6.': 'Na sexta fileira, o rei fica melhor na coluna vizinha, na direção do centro. Não Rc6, porque o rei preto voltaria para d8 e o mate demoraria muito mais. Se agora o rei voltar para d8, Ta8 é mate na hora.',
      '10.': 'Mate em exatamente dez lances a partir da posição inicial.',
    },
  }),
  ex({
    id: 'capablanca-2',
    title: 'Exemplo 2: torre e rei contra o rei no centro',
    fen: '8/8/8/4k3/8/8/8/4K2R w - - 0 1',
    intro: 'Com o rei preto no centro, o melhor é avançar o seu próprio rei.',
    moves: '1.Ke2 Kd5 2.Ke3 Kc4 3.Rh5 Kc3 4.Rh4 Kc2 5.Rc4+ Kb3 6.Kd3 Kb2 7.Rb4+ Ka3 8.Kc3 Ka2 9.Ra4+ Kb1 10.Ra8 Kc1 11.Ra1#',
    notes: {
      '2.': 'A torre ainda não entrou no jogo: o rei vai direto para o centro, não na frente do outro rei, mas ao lado dele. Se o rei preto for para e5, Th5+ o empurra de volta.',
      '3.': 'Também contra 2...Rc4 a resposta é Th5. Se 3...Rb4, segue 4.Rd3.',
      '4.': 'Contra 3...Rc3, Th4 mantém o rei confinado ao menor número de casas possível.',
      '8.': 'Repare quantas vezes o rei branco ficou ao lado da torre: para defendê-la e para tirar casas do rei adversário. Agora é mate em três.',
      '10.': 'A torre vai para qualquer casa da coluna a, obrigando o rei preto a ficar na frente do branco.',
      '11.': 'Onze lances. Capablanca acredita que, em quaisquer condições, deve ser feito em menos de vinte.',
    },
  }),
  ex({
    id: 'capablanca-3',
    title: 'Exemplo 3: dois bispos e rei contra rei',
    fen: '7k/8/8/8/8/8/8/2B1KB2 w - - 0 1',
    intro: 'Aqui o rei preto precisa ir não só para a borda, mas para um canto.',
    moves: '1.Bd3 Kg7 2.Bg5 Kf7 3.Bf5 Kg7 4.Kf2 Kf7 5.Kg3 Kg7 6.Kh4 Kf7 7.Kh5 Kg7 8.Bg6 Kg8 9.Kh6 Kf8 10.Bh5 Kg8 11.Be7 Kh8 12.Bg4 Kg8 13.Be6+ Kh8 14.Bf6#',
    notes: {
      '3.': 'Com três lances de bispo, o rei preto já está preso em poucas casas.',
      '4.': 'Antes do mate, o rei branco precisa chegar à sexta fileira e a uma das duas últimas colunas: h6, g6, f7 ou f8. h6 e g6 são as mais próximas.',
      '10.': 'As brancas precisam ganhar tempo e mover um bispo, para forçar o rei preto a voltar.',
      '12.': 'O bispo das casas brancas se prepara para dar xeque pela diagonal quando o rei voltar para g8.',
      '14.': 'Catorze lances. Em qualquer posição, deve ser feito em menos de trinta. Cuidado para não cair num afogamento!',
    },
  }),
  ex({
    id: 'capablanca-4',
    title: 'Exemplo 4: dama e rei contra rei',
    fen: '8/8/8/4k3/8/8/8/4K2Q w - - 0 1',
    intro: 'A dama reúne o poder da torre e do bispo: é o mate mais fácil e deve sair em menos de dez lances.',
    moves: '1.Qc6 Kd4 2.Kd2 Ke5 3.Ke3 Kf5 4.Qd6 Kg5 5.Qe6 Kh4 6.Qg6 Kh3 7.Kf3 Kh2 8.Qg2#',
    notes: {
      '1.': 'Um bom começo é mover a dama, tirando o máximo de casas do rei preto.',
      '2.': 'O rei preto já tem só uma casa disponível.',
      '4...': 'Se as pretas jogassem Rg4, viria Dg6+.',
      '5...': 'Se Rh5, Rf4 e mate no lance seguinte.',
      '8.': 'Como com a torre, o rei preto é forçado para a borda. A dama, muito mais forte, faz tudo mais rápido.',
    },
  }),
  ex({
    id: 'capablanca-5',
    title: 'Exemplo 5: rei na frente do peão empata',
    fen: '8/8/8/8/4k3/8/3KP3/8 w - - 0 1',
    result: '1/2-1/2',
    sources: [CF2],
    intro: 'As pretas empatam mantendo o rei na frente do peão e, quando não dá, na frente do rei branco.',
    moves: '1.e3 Ke5 2.Kd3 Kd5 3.e4+ Ke5 4.Ke3 Ke6 5.Kf4 Kf6 6.e5+ Ke6 7.Ke4 Ke7 8.Kd5 Kd7 9.e6+ Ke7 10.Ke5 Ke8 11.Kd6 Kd8',
    notes: {
      '2...': 'Lance muito importante: qualquer outro perderia. Como o rei preto não pode ficar colado no peão, vai o mais à frente possível e na frente do rei branco.',
      '5...': 'De novo: o rei branco sobe, e o rei preto se mantém na frente dele.',
      '11...': 'Se o peão avançar, o rei preto entra na frente dele: as brancas perdem o peão ou jogam Re6, e é afogamento. Empate.',
    },
  }),
  ex({
    id: 'capablanca-6',
    title: 'Exemplo 6: rei na frente do peão, com uma casa entre eles',
    fen: '8/8/5k2/8/5K2/8/4P3/8 w - - 0 1',
    sources: [CF2],
    intro: 'Avance o rei até onde o peão continuar seguro, e só avance o peão quando a segurança dele exigir.',
    moves: '1.Ke4 Ke6 2.e3 Kf6 3.Kd5 Ke7 4.Ke5 Kd7 5.Kf6 Ke8 6.e4 Kd7 7.e5 Ke8 8.Ke6 Kf8 9.Kd7',
    notes: {
      '1...': 'As pretas não deixam o rei branco avançar; então o peão anda para obrigar o rei preto a sair.',
      '3...': 'Se 3...Rf5, o peão teria de ir para e4, senão Re5 ganharia o peão. Como não foi assim, o rei branco sobe mais um pouco.',
      '6.': 'O peão ficou para trás demais e agora sobe para perto da proteção do rei.',
      '7.': 'Rf7 não serviria: as pretas jogariam Rd6 e o rei branco teria de voltar para proteger o peão.',
      '8.': 'e6 empataria: as pretas jogariam Rf8 e teríamos o caso do Exemplo 5.',
      '9.': 'O rei preto se move, o peão avança até e8, vira dama, e acabou.',
    },
  }),
  ex({
    id: 'capablanca-7',
    title: 'Exemplo 7: dois peões contra um',
    fen: '5k2/6p1/4K1P1/5P2/8/8/8/8 w - - 0 1',
    sources: [CF3],
    intro: '1.f6 não ganha: as pretas responderiam Rg8, e não gxf6. O caminho é outro.',
    moves: '1.Kd7 Kg8 2.Ke7 Kh8 3.f6 gxf6 4.Kf7 f5 5.g7+ Kh7 6.g8=Q+ Kh6 7.Qg6#',
    notes: {
      '1.': 'Contra 1.f6 Rg8: se 2.fxg7 Rxg7 e empata; se 2.f7+ Rf8 e o peão nunca vira dama sem se perder; se 2.Re7 gxf6 3.Rxf6 Rf8 e empata.',
      '3...': 'Se 3...Rg8, 4.f7+ Rh8 5.f8=D mate.',
    },
  }),
  ex({
    id: 'capablanca-8',
    title: 'Exemplo 8: a única maneira de ganhar',
    fen: '8/6p1/3k4/8/3K1PP1/8/8/8 w - - 0 1',
    sources: [CF3],
    intro: 'Nem 1.f5 nem 1.g5 ganham (a oposição explica, mais adiante no livro). Mas 1.Re4 ganha.',
    moves: '1.Ke4 Ke6 2.f5+ Kf6 3.Kf4 g6 4.g5+ Kf7 5.f6 Ke6 6.Ke4 Kf7 7.Ke5 Kf8 8.f7 Kxf7 9.Kd6 Kf8 10.Ke6 Kg7 11.Ke7 Kg8 12.Kf6 Kh7 13.Kf7 Kh8 14.Kxg6 Kg8 15.Kh6 Kh8 16.g6 Kg8 17.g7 Kf7 18.Kh7',
    notes: {
      '1...': 'Se 1...g6: 2.Rd4 Re6 3.Rc5 Rf6 4.Rd6 Rf7 5.g5 Rg7 6.Re7 Rg8 7.Rf6 Rh7 8.Rf7 e as brancas ganham o peão.',
      '3...': 'Se as pretas seguram este peão, chegamos ao final do Exemplo 7.',
      '7...': 'As brancas não conseguem coroar o peão do bispo (descubra por quê), mas, entregando esse peão, ganham o outro e a partida.',
      '14...': 'As pretas ainda resistem. A única maneira de ganhar é a do livro, como se vê experimentando.',
      '15.': 'Se 15.Rf6 Rh7, as brancas teriam de voltar a esta posição: contra 16.g6+ Rh8 é empate.',
      '18.': 'As brancas coroam o peão e ganham.',
    },
  }),
  ex({
    id: 'capablanca-9',
    title: 'Exemplo 9: três peões contra dois',
    fen: '8/6pp/3k4/8/3K1PPP/8/8/8 w - - 0 1',
    sources: [CF3],
    intro: 'Qualquer peão ganha, mas a regra geral é avançar o peão que não tem peão adversário na frente.',
    moves: '1.f5 Ke7 2.Ke5 Kf7 3.g5 Ke7 4.h5',
    notes: {
      '1...': 'Se 1...g6, 2.f6, e temos um final parecido com os anteriores. Se 1...h6, 2.g5.',
      '3...': 'Se 3...g6, 4.f6; se 3...h6, 4.g6+, e de novo um final já visto.',
      '4.': 'Seguindo com g6, chega-se ao final já mostrado. Se 4...g6, então hxg6 hxg6 e f6+, com o mesmo resultado.',
    },
  }),
  ex({
    id: 'capablanca-10',
    title: 'Exemplo 10: peões dos dois lados',
    fen: '8/p6p/4k3/8/4K3/8/P5PP/8 w - - 0 1',
    sources: [CF3],
    intro: 'Regra geral: aja logo do lado em que você tem mais forças.',
    moves: '1.g4 a5 2.a4 Kf6 3.h4 Ke6 4.g5 Kf7 5.Kf5 Kg7 6.h5 Kf7 7.Ke5',
    notes: {
      '1.': 'Em geral, avance o peão que não tem oposição.',
      '1...': 'As pretas avançam do outro lado. Aqui as duas coisas ganham, mas em geral é bom parar o avanço quando o rei adversário está longe.',
      '3...': 'Se 3...Rg6, uma conta simples mostra que o rei branco vai ao outro lado, ganha o peão de a5 e coroa o seu peão muito antes das pretas.',
      '6...': 'Se 6...h6, 7.g6: os dois peões se defendem sozinhos e o rei branco vai ganhar o outro peão.',
      '7.': 'Hora de levar o rei para o outro lado, ganhar o peão preto e coroar o peão sozinho. Típico desses finais.',
    },
  }),
];

export function libraryExample(id: string): FamousGame | undefined {
  return LIBRARY_EXAMPLES.find((g) => g.id === id);
}

export const BOOKS: Book[] = [
  {
    id: 'capablanca',
    title: 'Fundamentos do Xadrez',
    original: 'Chess Fundamentals',
    author: 'José Raúl Capablanca',
    year: 1921,
    source: 'Texto em inglês: Project Gutenberg, e-book nº 33870 (edição revista de 1934). Tradução do Checkoru.',
    rights: 'Domínio público. Capablanca morreu em 1942; no Brasil a obra está livre desde 2013.',
    chapters: [
      {
        id: 'cap1',
        title: 'Capítulo I. Primeiros princípios: finais, meio-jogo e aberturas',
        intro:
          'A primeira coisa que o estudante deve fazer é se familiarizar com o poder das peças. A melhor maneira de fazer isso é aprender a dar rapidamente alguns dos mates simples.',
        sections: [
          {
            id: 'mates-simples',
            number: 1,
            title: 'Alguns mates simples',
            blocks: [
              { kind: 'h', text: 'Exemplo 1. Torre e rei contra rei' },
              { kind: 'p', text: 'O princípio é empurrar o rei adversário para a última linha de qualquer lado do tabuleiro.' },
              { kind: 'ex', id: 'capablanca-1' },
              {
                kind: 'p',
                text: 'Nesta posição, o poder da torre aparece logo no primeiro lance, Ta7, que imediatamente confina o rei preto à última fileira, e o mate sai rápido com: 1.Ta7 Rg8 2.Rg2.',
              },
              {
                kind: 'p',
                text: 'A ação combinada do rei e da torre é necessária para chegar a uma posição em que o mate possa ser forçado. O princípio geral que o iniciante deve seguir é manter o seu rei, tanto quanto possível, na mesma fileira ou, como neste caso, na mesma coluna que o rei adversário.',
              },
              {
                kind: 'p',
                text: 'Quando, neste caso, o rei tiver chegado à sexta fileira, é melhor colocá-lo não na mesma coluna, mas na coluna vizinha, na direção do centro.',
              },
              { kind: 'p', text: '2...Rf8 3.Rf3 Re8 4.Re4 Rd8 5.Rd5 Rc8 6.Rd6' },
              {
                kind: 'p',
                text: 'Não Rc6, porque então o rei preto voltaria para d8 e levaria muito mais tempo para dar mate. Se agora o rei voltar para d8, Ta8 dá mate na hora.',
              },
              { kind: 'p', text: '6...Rb8 7.Tc7 Ra8 8.Rc6 Rb8 9.Rb6 Ra8 10.Tc8#' },
              {
                kind: 'p',
                text: 'Foram exatamente dez lances para dar mate a partir da posição inicial. No 5º lance, as pretas poderiam ter jogado Re8 e, seguindo o princípio, as brancas continuariam 6.Rd6 Rf8 (o rei preto acabará sendo forçado a ficar na frente do rei branco e levará mate com Ta8) 7.Re6 Rg8 8.Rf6 Rh8 9.Rg6 Rg8 10.Ta8#.',
              },

              { kind: 'h', text: 'Exemplo 2' },
              { kind: 'ex', id: 'capablanca-2' },
              {
                kind: 'p',
                text: 'Como o rei preto está no centro do tabuleiro, o melhor jeito de prosseguir é avançar o seu próprio rei assim: 1.Re2 Rd5 2.Re3. Como a torre ainda não entrou no jogo, é melhor levar o rei direto para o centro do tabuleiro, não na frente do outro rei, mas ao lado dele. Se agora o rei preto for para e5, a torre o empurra de volta com Th5+. Por outro lado, se 2...Rc4, também 3.Th5. Se agora 3...Rb4, segue 4.Rd3; mas se 3...Rc3, então 4.Th4, mantendo o rei confinado ao menor número de casas possível.',
              },
              {
                kind: 'p',
                text: 'Agora o final pode continuar: 4...Rc2 5.Tc4+ Rb3 6.Rd3 Rb2 7.Tb4+ Ra3 8.Rc3 Ra2. Repare quantas vezes o rei branco se colocou ao lado da torre, não só para defendê-la, mas também para reduzir a mobilidade do rei adversário. Agora as brancas dão mate em três lances: 9.Ta4+ Rb1 10. a torre vai para qualquer casa da coluna a, obrigando o rei preto a ficar na frente do branco, Rc1 11.Ta1#.',
              },
              {
                kind: 'p',
                text: 'Foram onze lances para dar mate e, em quaisquer condições, acredito que deve ser feito em menos de vinte. Embora possa ser monótono, vale a pena o iniciante praticar essas coisas, porque elas ensinam a manejar bem as peças.',
              },

              { kind: 'h', text: 'Exemplo 3. Dois bispos e rei contra rei' },
              { kind: 'ex', id: 'capablanca-3' },
              {
                kind: 'p',
                text: 'Como o rei preto está no canto, as brancas podem jogar 1.Bd3 Rg7 2.Bg5 Rf7 3.Bf5, e o rei preto já está confinado a poucas casas. Se, na posição original, o rei preto estivesse no centro do tabuleiro, ou longe da última fileira, as brancas deveriam ter avançado o rei e então, com a ajuda dos bispos, restringido os movimentos do rei preto ao menor número de casas possível.',
              },
              {
                kind: 'p',
                text: 'Podemos continuar agora: 3...Rg7 4.Rf2. Neste final, o rei preto não só tem de ser empurrado para a borda do tabuleiro, como também precisa ser forçado para um canto. Antes que se possa dar mate, o rei branco tem de chegar à sexta fileira e, ao mesmo tempo, a uma das duas últimas colunas; neste caso h6, g6, f7 ou f8. Como h6 e g6 são as casas mais próximas, é para uma delas que o rei deve ir. 4...Rf7 5.Rg3 Rg7 6.Rh4 Rf7 7.Rh5 Rg7 8.Bg6 Rg8 9.Rh6 Rf8.',
              },
              {
                kind: 'p',
                text: 'As brancas agora precisam ganhar tempo e mover um dos bispos, para forçar o rei preto a voltar: 10.Bh5 Rg8 11.Be7 Rh8. Agora o bispo branco precisa se colocar numa casa de onde possa dar xeque no lance seguinte, pela diagonal branca, quando o rei preto voltar para g8. 12.Bg4 Rg8 13.Be6+ Rh8 14.Bf6#.',
              },
              {
                kind: 'p',
                text: 'Foram catorze lances para forçar o mate e, em qualquer posição, deve ser feito em menos de trinta. Em todos os finais deste tipo, é preciso cuidado para não cair num afogamento.',
              },
              {
                kind: 'p',
                text: 'Neste final em particular, lembre que o rei precisa ser empurrado não só para a borda do tabuleiro, mas também para um canto. Em todos esses finais, porém, não importa se o rei é forçado para a última fileira ou para uma coluna da borda, por exemplo h5 ou a4, e1 ou d8.',
              },

              { kind: 'h', text: 'Exemplo 4. Dama e rei contra rei' },
              {
                kind: 'p',
                text: 'Chegamos agora a dama e rei contra rei. Como a dama reúne o poder da torre e do bispo, este é o mate mais fácil de todos e deve sempre ser feito em menos de dez lances. Veja a seguinte posição:',
              },
              { kind: 'ex', id: 'capablanca-4' },
              {
                kind: 'p',
                text: 'Um bom jeito de começar é fazer o primeiro lance com a dama, tentando limitar ao máximo a mobilidade do rei preto. Assim: 1.Dc6 Rd4 2.Rd2. O rei preto já tem só uma casa disponível. 2...Re5 3.Re3 Rf5 4.Dd6 Rg5 (se as pretas jogarem Rg4, então Dg6+) 5.De6 Rh4 (se Rh5, Rf4 e mate no lance seguinte) 6.Dg6 Rh3 7.Rf3, o rei preto se move, e 8. a dama dá mate.',
              },
              {
                kind: 'p',
                text: 'Neste final, como no caso da torre, o rei preto precisa ser forçado para a borda do tabuleiro; só que, como a dama é muito mais poderosa que a torre, o processo é bem mais fácil e curto. Estes são os três finais elementares, e em todos eles o princípio é o mesmo: em cada caso é necessária a cooperação do rei. Para forçar um mate sem a ajuda do rei, são necessárias pelo menos duas torres.',
              },
            ],
          },
          {
            id: 'promocao',
            number: 2,
            title: 'A promoção do peão',
            blocks: [
              {
                kind: 'p',
                text: 'Ganhar um peão é a menor vantagem material que se pode obter numa partida, e muitas vezes basta para vencer, mesmo quando o peão é a única peça que sobra além dos reis. De modo geral, é essencial que o rei fique na frente do seu peão, com pelo menos uma casa entre os dois. Se o rei adversário estiver bem na frente do peão, a partida não pode ser ganha. Os exemplos a seguir explicam melhor.',
              },
              { kind: 'h', text: 'Exemplo 5' },
              { kind: 'ex', id: 'capablanca-5' },
              {
                kind: 'p',
                text: 'A posição é de empate, e o jeito de jogar é as pretas manterem o rei sempre bem na frente do peão; quando isso não for possível, como nesta posição por causa do rei branco, o rei preto tem de ficar na frente do rei branco. O jogo seguiria assim: 1.e3 Re5 2.Rd3 Rd5. Este é um lance muito importante: qualquer outro perderia, como veremos depois. Como o rei preto não pode ficar colado no peão, ele precisa ir o mais à frente possível e, ao mesmo tempo, ficar na frente do rei branco.',
              },
              {
                kind: 'p',
                text: '3.e4+ Re5 4.Re3 Re6 5.Rf4 Rf6. De novo o mesmo caso: conforme o rei branco sobe, o rei preto tem de se manter na frente dele, já que não pode chegar ao peão. 6.e5+ Re6 7.Re4 Re7 8.Rd5 Rd7 9.e6+ Re7 10.Re5 Re8 11.Rd6 Rd8.',
              },
              {
                kind: 'p',
                text: 'Se agora as brancas avançarem o peão, o rei preto entra na frente dele, e as brancas ou entregam o peão ou jogam Re6, e o resultado é afogamento. Se, em vez de avançar o peão, as brancas recuarem o rei, as pretas trazem o rei até o peão e, quando forem obrigadas a voltar, vão para a casa bem na frente do peão, prontas para subir de novo ou para ficar na frente do rei branco, como antes, se ele avançar.',
              },
              {
                kind: 'p',
                text: 'Todo esse modo de proceder é muito importante, e o estudante deve conhecê-lo a fundo: envolve princípios que veremos mais adiante, e muito iniciante já perdeu posições idênticas por não saber jogá-las. Neste ponto do livro, nunca é demais insistir na sua importância.',
              },
              { kind: 'h', text: 'Exemplo 6' },
              { kind: 'p', text: 'Nesta posição as brancas ganham, porque o rei está na frente do seu peão e há uma casa entre eles.' },
              { kind: 'ex', id: 'capablanca-6' },
              {
                kind: 'p',
                text: 'O método é avançar o rei até onde a segurança do peão permitir, e nunca avançar o peão antes que a própria segurança dele exija. Assim: 1.Re4 Re6. As pretas não deixam o rei branco avançar; por isso as brancas agora são obrigadas a avançar o peão, para forçar o rei preto a sair. Então podem avançar o rei. 2.e3 Rf6 3.Rd5 Re7.',
              },
              {
                kind: 'p',
                text: 'Se as pretas tivessem jogado 3...Rf5, as brancas seriam obrigadas a avançar o peão para e4, porque não poderiam avançar o rei sem dar às pretas a chance de jogar Re5, ganhando o peão. Como não foi isso, é melhor as brancas ainda não avançarem o peão, já que a segurança dele não exige, e tentarem levar o rei mais à frente. Assim: 4.Re5 Rd7 5.Rf6 Re8.',
              },
              {
                kind: 'p',
                text: 'Agora o peão branco ficou muito para trás e pode subir até perto da proteção do rei. 6.e4 Rd7. Agora não serviria jogar Rf7, porque as pretas jogariam Rd6 e as brancas teriam de voltar com o rei para proteger o peão. Então elas precisam continuar: 7.e5 Re8.',
              },
              {
                kind: 'p',
                text: 'Se as pretas fossem para qualquer outra casa, as brancas poderiam jogar Rf7 e depois avançar o peão para e6, e7 e e8, casas todas protegidas pelo rei. Como as pretas tentam impedir isso, as brancas agora precisam forçá-las a sair, sempre mantendo o rei na frente do peão. Assim: 8.Re6. (e6 empataria, porque as pretas jogariam Rf8 e teríamos uma posição parecida com a do Exemplo 5.) 8...Rf8 9.Rd7. O rei preto se move, o peão branco avança até e8, vira dama, e acabou.',
              },
              {
                kind: 'p',
                text: 'Este final é como o anterior e, pelas mesmas razões, deve ser bem entendido antes de seguir adiante.',
              },
            ],
          },
          {
            id: 'finais-de-peoes',
            number: 3,
            title: 'Finais de peões',
            blocks: [
              {
                kind: 'p',
                text: 'Vou mostrar agora alguns finais simples de dois peões contra um, ou três contra dois, para que o leitor veja como se ganham. Darei menos explicações: cabe ao estudante pensar por conta própria. Além disso, ninguém aprende a jogar bem só estudando um livro. Ele serve apenas de guia; o resto tem de ser feito pelo professor, se o estudante tiver um; se não tiver, o estudante vai aprender, com longa e amarga experiência, a aplicação prática de muitas coisas explicadas no livro.',
              },
              { kind: 'h', text: 'Exemplo 7' },
              { kind: 'ex', id: 'capablanca-7' },
              {
                kind: 'p',
                text: 'Nesta posição as brancas não ganham jogando 1.f6, porque as pretas respondem não gxf6, que perderia, mas 1...Rg8; e se então 2.fxg7 Rxg7, empata, como já vimos. Se 2.f7+ Rf8, e as brancas nunca conseguirão coroar o peão sem perdê-lo. Se 2.Re7 gxf6 3.Rxf6 Rf8, e empata. As brancas, porém, ganham a posição do diagrama jogando: 1.Rd7 Rg8 2.Re7 Rh8 3.f6 gxf6. (Se 3...Rg8, 4.f7+ Rh8 5.f8=D mate.) 4.Rf7 f5 5.g7+ Rh7 6.g8=D+ Rh6 7.Dg6#.',
              },
              { kind: 'h', text: 'Exemplo 8' },
              { kind: 'ex', id: 'capablanca-8' },
              {
                kind: 'p',
                text: 'Nesta posição as brancas não ganham com 1.f5: a melhor resposta das pretas, g6, empata (o estudante deve verificar). Também não ganham com 1.g5, porque g6 empata. Isso por causa do princípio da “oposição”, que governa este final e todos os finais de peões vistos até aqui, e que será explicado melhor mais adiante.',
              },
              {
                kind: 'p',
                text: 'As brancas podem ganhar, porém, jogando 1.Re4 Re6. (Se 1...g6 2.Rd4 Re6 3.Rc5 Rf6 4.Rd6 Rf7 5.g5 Rg7 6.Re7 Rg8 7.Rf6 Rh7 8.Rf7, e as brancas ganham o peão.) 2.f5+ Rf6 3.Rf4 g6. (Se este peão ficar parado, chegamos ao final do Exemplo 7.) 4.g5+ Rf7 5.f6 Re6 6.Re4 Rf7 7.Re5 Rf8. As brancas não conseguem coroar o peão do bispo (descubra por quê), mas, entregando-o, ganham o outro peão e a partida. Assim: 8.f7 Rxf7 9.Rd6 Rf8 10.Re6 Rg7 11.Re7 Rg8 12.Rf6 Rh7 13.Rf7 Rh8 14.Rxg6 Rg8.',
              },
              {
                kind: 'p',
                text: 'Ainda há alguma resistência na posição das pretas. Na verdade, a única maneira de ganhar é a que damos aqui, como se verá facilmente experimentando. 15.Rh6 (se 15.Rf6 Rh7, e para ganhar as brancas têm de voltar à posição atual, porque contra 16.g6+ Rh8 empata) Rh8 16.g6 Rg8 17.g7 Rf7 18.Rh7, e as brancas coroam o peão e ganham.',
              },
              {
                kind: 'p',
                text: 'Este final, aparentemente tão simples, deve mostrar ao estudante as enormes dificuldades a vencer, mesmo quando quase não há peças no tabuleiro, contra um adversário que sabe usar os recursos de que dispõe. E deve mostrar também a necessidade de prestar muita atenção a essas coisas elementares, que são a base da verdadeira maestria no xadrez.',
              },
              { kind: 'h', text: 'Exemplo 9' },
              { kind: 'ex', id: 'capablanca-9' },
              {
                kind: 'p',
                text: 'As brancas ganham avançando qualquer um dos três peões no primeiro lance, mas convém seguir a regra geral, sempre que não houver bom motivo contra: avançar o peão que não tem peão adversário na frente. Assim começamos com 1.f5 Re7. (Se g6, f6, e temos um final parecido com um dos mostrados acima. Se 1...h6, 2.g5.) 2.Re5 Rf7 3.g5 Re7. (Se 3...g6, 4.f6; e se 3...h6, 4.g6+; em qualquer caso, temos um final parecido com os já vistos.) 4.h5, e seguindo com g6 temos o mesmo final mostrado antes. Se as pretas jogarem 4...g6, então hxg6 hxg6 e f6+, com o mesmo resultado.',
              },
              {
                kind: 'p',
                text: 'Depois dos casos com todos os peões do mesmo lado do tabuleiro, vamos ver agora um caso com peões dos dois lados.',
              },
              { kind: 'h', text: 'Exemplo 10' },
              { kind: 'p', text: 'Nesses casos, a regra geral é agir logo do lado em que você tem mais forças.' },
              { kind: 'ex', id: 'capablanca-10' },
              {
                kind: 'p',
                text: '1.g4. Em geral, é aconselhável avançar o peão que está livre de oposição. 1...a5. As pretas avançam do outro lado, e agora as brancas pensam se devem ou não parar esse avanço. Neste caso, os dois caminhos ganham, mas em geral o avanço deve ser parado quando o rei adversário está longe. 2.a4 Rf6 3.h4 Re6.',
              },
              {
                kind: 'p',
                text: 'Se 3...Rg6, uma conta simples mostra que as brancas vão com o rei para o outro lado, ganham o peão de a5 e coroam o seu peão muito antes que as pretas consigam fazer o mesmo. 4.g5 Rf7 5.Rf5 Rg7 6.h5 Rf7. (Se 6...h6, 7.g6, e então os dois peões se defendem sozinhos e as brancas podem ir com o rei para o outro lado, ganhar o outro peão.) 7.Re5.',
              },
              {
                kind: 'p',
                text: 'Agora é hora de ir com o rei para o outro lado, ganhar o peão preto e coroar o peão sozinho. Isso é típico de todos esses finais, e o estudante deve trabalhá-lo neste caso e em outros parecidos que ele mesmo montar.',
              },
            ],
          },
        ],
      },
    ],
  },
];

export function sectionById(id: string): { book: Book; chapter: BookChapter; section: BookSection } | undefined {
  for (const book of BOOKS)
    for (const chapter of book.chapters) {
      const section = chapter.sections.find((s) => s.id === id);
      if (section) return { book, chapter, section };
    }
  return undefined;
}
