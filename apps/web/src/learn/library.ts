/**
 * Biblioteca de clássicos em domínio público, traduzidos para o português e com os exemplos no tabuleiro.
 *
 * Capablanca, *Chess Fundamentals* (1921; texto da edição revista de 1934), Project Gutenberg nº 33870
 * (espelho oficial: github.com/GITenberg/Chess-Fundamentals_33870). Domínio público nos EUA; no Brasil, a obra
 * está em domínio público desde 2013 (Lei 9.610/98, art. 41: 70 anos após a morte do autor, em 1942).
 * Tradução do Checkoru, feita direto do texto em inglês. O livro usa a notação descritiva da época; aqui os lances
 * estão em notação algébrica (R rei, D dama, T torre, B bispo, C cavalo). As posições iniciais foram copiadas dos
 * diagramas do livro (imagens Fig1 a Fig4 da edição do Gutenberg). Tudo é conferido em `learn.test.ts`.
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

const CF = "Capablanca, Chess Fundamentals (1921), cap. I, §1 'Some Simple Mates' (Project Gutenberg nº 33870)";

const ex = (g: Omit<FamousGame, 'place' | 'year' | 'result' | 'sources' | 'white' | 'black'> & { white?: string; black?: string }): FamousGame => ({
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
