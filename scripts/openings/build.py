"""Gera apps/web/public/openings.json a partir do banco de nomes de aberturas do Lichess (CC0).

Uso: python3 scripts/openings/build.py a.tsv b.tsv c.tsv d.tsv e.tsv > apps/web/public/openings.json
Fonte: https://github.com/lichess-org/chess-openings (domínio público / CC0).
Saída: {"<posição sem contadores>": ["ECO", "Nome"]}. Quando duas linhas chegam na mesma posição,
fica a de nome mais curto (a mais geral).
"""
import csv, io, json, sys
import chess, chess.pgn

out = {}
for path in sys.argv[1:]:
    with open(path, newline='') as f:
        for row in csv.DictReader(f, delimiter='\t'):
            game = chess.pgn.read_game(io.StringIO(row['pgn']))
            board = game.board()
            for m in game.mainline_moves():
                board.push(m)
            key = board.epd()
            if key not in out or len(row['name']) < len(out[key][1]):
                out[key] = [row['eco'], row['name']]
json.dump(out, sys.stdout, ensure_ascii=False, separators=(',', ':'))
print(f'{len(out)} posições', file=sys.stderr)
