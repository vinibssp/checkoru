# Checkoru: regras para quem desenvolve (pessoas e IA)

- Responda e escreva textos do app em português do Brasil.
- **Conteúdo de xadrez sempre baseado em livros de referência, com a fonte citada.** Vale para aulas, comentários
  de partidas, explicações da Oru, valores, princípios e também métodos técnicos (ex.: anti-trapaça). Confira a
  fonte antes de citar e registre em `docs/REFERENCIAS.md`. Detalhes nesse arquivo.
- Toda posição e lance de aula ou jogo famoso precisa passar no teste `apps/web/src/learn/learn.test.ts`.
- Orçamento zero: só serviços gratuitos (Cloudflare free, GitHub Actions, Lichess CC0).
- Commits com `git commit -s` (DCO, veja CONTRIBUTING.md). Segredos nunca entram no repositório.
- Depois de cada mudança no app, o APK de teste sai pelo GitHub Actions (release `teste`) e o site de teste pelo
  GitHub Pages.
