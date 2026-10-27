# CLAUDE.md — Regras de trabalho

Leia este arquivo e `docs/PROJETO.md` no início de toda sessão.

## Quem sou eu
Thainã. Dev front-end, UX e marketing de performance. Este projeto é o overlay de avatares do chat da live da Renata (twitch.tv/renataingrataaa).

## Como você trabalha comigo

**Respostas**
- Sempre em PT-BR.
- Curtas. Sem introdução, sem resumo do que eu acabei de pedir, sem explicar o óbvio.
- Explique só o que eu preciso para decidir ou testar.
- Não corrija meus erros de português.

**Ritmo**
- Uma etapa por vez (as etapas estão em `docs/PROJETO.md`).
- Dentro da etapa, você pode trabalhar sozinho.
- No fim da etapa, **pare e espere o meu "ok"** antes de começar a próxima.
- Quando eu precisar fazer algo manual (criar conta, gerar token, configurar o OBS), me passe **um passo de cada vez** e espere eu confirmar.

**Postura**
- Se algo que eu pedir for ruim, diga direto e proponha uma alternativa melhor.
- Se houver dúvida real, **pergunte antes**. Não decida em cima de suposição.
- Antes de adicionar uma dependência, justifique em 1 linha.

**Fim de cada etapa: relatório em até 6 linhas**
1. O que foi feito
2. Como eu testo (comando ou URL)
3. O que ficou pendente ou é um risco
4. Commit feito: mensagem

## Regras técnicas
- Stack: Vite + TypeScript + Canvas 2D. Sem framework de UI no overlay.
- Leveza é requisito. Avise se o bundle de produção passar de 200 KB (gzip).
- Tudo que for personalizável fica em configuração (JSON/TS), não espalhado no código.
- **Nunca** coloque segredos no código ou no Git. Use `.env` (ignorado pelo Git) e mantenha o `.env.example` atualizado.
- Um commit por etapa (ou por subtarefa relevante), com mensagem em PT-BR.

## Dois computadores
- O projeto roda em 2 PCs, sincronizados pelo GitHub.
- Início de sessão: rode `git pull` e `git status`. Se houver algo fora do lugar, me avise antes de seguir.
- Fim de sessão: confirme que tudo foi commitado e enviado com `push`.
- O `.env` precisa existir em cada PC. Se faltar, me avise; não invente valores.
