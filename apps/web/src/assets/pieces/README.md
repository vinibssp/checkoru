# Conjuntos de peças

Arquivos SVG copiados do repositório do [Lichess](https://github.com/lichess-org/lila/tree/master/public/piece)
e otimizados com SVGO (estilos embutidos nos atributos, sem mudar o desenho).
Todos têm licença compatível com a AGPL-3.0 do Checkoru.

| Pasta | Nome no app | Original | Autor | Licença |
| --- | --- | --- | --- | --- |
| `classicas` | Clássicas | merida | Armando Hernandez Marroquin | GPL-2.0-or-later |
| `contorno` | Contorno | mpchess | Maxime Chupin | GPL-3.0-or-later |
| `entalhadas` | Entalhadas | rhosgfx | RhosGFX | CC0 1.0 |
| `recorte` | Recorte | papercut | Nikolay Anzarov | CC BY 4.0 |
| `celtas` | Celtas | celtic | Maurizio Monge | MIT |
| `fantasia` | Fantasia | fantasy | Maurizio Monge | MIT |

Nomes dos arquivos: `w`/`b` (brancas/pretas) + `K Q R B N P` (rei, dama, torre, bispo, cavalo, peão).
Para adicionar um conjunto: crie uma pasta com os 12 arquivos e registre o nome em `src/themes.ts`.
