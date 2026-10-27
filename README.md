# elphatar

Overlay de avatares do chat para a live da Renata (twitch.tv/renataingrataaa).
Cada pessoa que fala no chat vira um personagem em pixel art andando na parte
de baixo da tela. Canvas 2D, sem framework, leveza como requisito.

Plano e etapas: [docs/PROJETO.md](docs/PROJETO.md).
Regras de trabalho: [CLAUDE.md](CLAUDE.md).

## Rodar local

```bash
npm install
npm run dev        # overlay em /, laboratorio em /laboratorio.html
npm run build      # build de producao em dist/
npm run preview    # serve o dist/
```

O `.env` precisa existir em cada PC: copie o `.env.example` e preencha.

## URLs

| Pagina | URL |
|---|---|
| Overlay (OBS) | https://lisboar.github.io/elphatar/ |
| Overlay com diagnostico | https://lisboar.github.io/elphatar/?debug=1 |
| Laboratorio de partes | https://lisboar.github.io/elphatar/laboratorio.html |

`?debug=1` desenha moldura, a faixa dos avatares e o fps — serve para
confirmar que o overlay carregou, ja que a pagina normal e transparente.

## OBS

Browser source, 1920x1080, com a URL do overlay. Guia completo de instalacao
no PC da Renata na Etapa 7.

## Deploy

Todo push na `main` publica no GitHub Pages pelo workflow
[.github/workflows/deploy.yml](.github/workflows/deploy.yml).
