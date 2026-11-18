#!/usr/bin/env python3
"""
Monta o banco de puzzles do Checkoru a partir do banco aberto do Lichess (CC0).
Fonte: https://database.lichess.org/#puzzles  (arquivo lichess_db_puzzle.csv.zst)

Uso:  zstdcat lichess_db_puzzle.csv.zst | python3 scripts/puzzles/build.py apps/web/public/puzzles

Escolhe os puzzles mais populares e confiáveis, até PER_BUCKET por faixa de 100 pontos de rating,
e grava arquivos JSON pequenos por faixa (o app só carrega as faixas perto do nível do jogador).
"""
import csv
import json
import os
import sys
from collections import Counter, defaultdict

PER_BUCKET = int(os.environ.get('PER_BUCKET', '800'))
MIN_RATING, MAX_RATING = 400, 2999
MIN_POPULARITY = 80
MIN_PLAYS = 300
MAX_DEVIATION = 95

# Temas que o app mostra (os outros continuam guardados, mas sem filtro próprio).
KEEP_THEMES = {
    'mateIn1', 'mateIn2', 'mateIn3', 'mate', 'fork', 'pin', 'skewer', 'discoveredAttack', 'doubleCheck',
    'sacrifice', 'deflection', 'attraction', 'clearance', 'interference', 'hangingPiece', 'trappedPiece',
    'kingsideAttack', 'queensideAttack', 'backRankMate', 'smotheredMate', 'endgame', 'rookEndgame',
    'pawnEndgame', 'queenEndgame', 'bishopEndgame', 'knightEndgame', 'opening', 'middlegame', 'promotion',
    'advancedPawn', 'quietMove', 'defensiveMove', 'zugzwang', 'exposedKing', 'crushing', 'advantage',
    'equality', 'short', 'long', 'oneMove', 'veryLong', 'capturingDefender', 'intermezzo', 'xRayAttack',
    'castling', 'enPassant', 'underPromotion', 'anastasiaMate', 'arabianMate', 'hookMate', 'bodenMate',
    'doubleBishopMate', 'dovetailMate',
}


def main() -> None:
    out_dir = sys.argv[1] if len(sys.argv) > 1 else 'puzzles'
    os.makedirs(out_dir, exist_ok=True)
    buckets: dict[int, list] = defaultdict(list)
    themes = Counter()
    seen = 0
    reader = csv.reader(sys.stdin)
    header = next(reader)
    col = {name: i for i, name in enumerate(header)}
    for row in reader:
        seen += 1
        try:
            rating = int(row[col['Rating']])
            if not (MIN_RATING <= rating <= MAX_RATING):
                continue
            if int(row[col['Popularity']]) < MIN_POPULARITY or int(row[col['NbPlays']]) < MIN_PLAYS:
                continue
            if int(row[col['RatingDeviation']]) > MAX_DEVIATION:
                continue
        except (ValueError, IndexError):
            continue
        b = rating // 100 * 100
        if len(buckets[b]) >= PER_BUCKET:
            continue
        tags = [t for t in row[col['Themes']].split() if t in KEEP_THEMES]
        moves = row[col['Moves']].split()
        if len(moves) < 2:
            continue
        buckets[b].append([row[col['PuzzleId']], row[col['FEN']], ' '.join(moves), rating, ' '.join(tags)])
        themes.update(tags)
        if all(len(buckets.get(x, ())) >= PER_BUCKET for x in range(MIN_RATING, MAX_RATING + 1, 100)):
            break

    index = {'source': 'Lichess puzzle database (CC0)', 'perBucket': PER_BUCKET, 'scanned': seen, 'buckets': {}, 'themes': dict(themes.most_common())}
    total = 0
    for b, items in sorted(buckets.items()):
        items.sort(key=lambda p: p[3])
        with open(os.path.join(out_dir, f'r{b}.json'), 'w') as f:
            json.dump(items, f, separators=(',', ':'), ensure_ascii=False)
        index['buckets'][str(b)] = len(items)
        total += len(items)
    index['total'] = total
    with open(os.path.join(out_dir, 'index.json'), 'w') as f:
        json.dump(index, f, separators=(',', ':'), ensure_ascii=False)
    print(f'{total} puzzles em {len(buckets)} faixas (lidos {seen})', file=sys.stderr)


if __name__ == '__main__':
    main()
