# Sons

Todos os arquivos foram cortados no começo (para tocar no instante do lance), nivelados no mesmo volume,
ganharam entrada e saída suaves e foram convertidos para MP3 mono.

| Pasta | Nome no app | Origem | Autor | Licença |
| --- | --- | --- | --- | --- |
| `madeira` (lance, captura, xeque) | Madeira | [PyChess](https://github.com/pychess/pychess/tree/master/sounds) (`move1.ogg`, `capture1.ogg`, combinados) | Equipe do PyChess | GPL-3.0-or-later |
| `madeira` (início, fim, tempo acabando) | Madeira | Conjunto "piano" do Lichess | Enigmahack | AGPL-3.0-or-later |
| `piano` | Piano | [Lichess](https://github.com/lichess-org/lila/tree/master/public/sound/piano) | Enigmahack | AGPL-3.0-or-later |
| `efeitos` | Efeitos | [Lichess](https://github.com/lichess-org/lila/tree/master/public/sound/sfx) "sfx" | Enigmahack | AGPL-3.0-or-later |
| `retro` | Retrô 8-bit | [Lichess](https://github.com/lichess-org/lila/tree/master/public/sound/nes) "nes" | Enigmahack | AGPL-3.0-or-later |
| `futurista` | Futurista | [Lichess](https://github.com/lichess-org/lila/tree/master/public/sound/futuristic) "futuristic" | Enigmahack | AGPL-3.0-or-later |

Os sons "standard", "robot", "woodland" e outros do Lichess **não** são livres (estão na lista de exceções do
`COPYING.md` do Lichess) e por isso não foram usados.

Eventos: `move`, `capture`, `check`, `start` (começo da partida), `lowtime` (menos de 10 s), `victory`, `defeat`, `draw`.
Para criar um conjunto novo, crie uma pasta com esses 8 arquivos e registre o nome em `src/themes.ts`.
