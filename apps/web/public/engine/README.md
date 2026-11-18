# Motor de análise

`stockfish-19-lite-single.js` e `.wasm`: Stockfish 19 (versão "lite", uma thread), compilado para WebAssembly
pelo projeto [stockfish.js](https://github.com/nmrugg/stockfish.js) (pacote npm `stockfish` 19.0.1).

- Licença: GPL-3.0 (texto em `COPYING.txt`), compatível com a AGPL-3.0 do Checkoru.
- Código-fonte: <https://github.com/official-stockfish/Stockfish> e <https://github.com/nmrugg/stockfish.js>.
- Roda num Web Worker, dentro do aparelho. Uma thread só para funcionar em qualquer navegador e no app
  Android sem cabeçalhos especiais (SharedArrayBuffer).

Para atualizar: `npm pack stockfish@<versão>` e copie os dois arquivos `*-lite-single.*` para cá.
