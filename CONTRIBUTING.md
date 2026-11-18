# Como contribuir

Obrigado por querer ajudar a Oru!

## Antes de começar

- Abra uma issue contando o que quer mudar, principalmente se for algo grande.
- Rode o projeto na sua máquina seguindo o [README](README.md).

## Regras do código

- TypeScript em modo estrito. `npm run typecheck` e `npm test` precisam passar.
- Regras do jogo, relógio e rating ficam em `packages/shared` e têm teste.
- Textos da interface em português do Brasil, simples e diretos.
- Nada de rastreadores, anúncios ou bibliotecas do Google Play Services
  (o app precisa continuar aceito pelo F-Droid).
- Toda cor e tamanho visual sai das variáveis CSS do tema (tudo é personalizável).

## Certificado de origem (DCO)

Cada commit precisa da linha `Signed-off-by`, que você adiciona com:

```bash
git commit -s -m "Descrição da mudança"
```

Com ela você declara que escreveu o código (ou tem direito de enviá-lo) e que ele pode
ser distribuído sob a licença do projeto, nos termos do
[Developer Certificate of Origin](https://developercertificate.org/).

## Licença

Contribuições entram sob a [AGPL-3.0-or-later](LICENSE).
