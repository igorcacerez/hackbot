# HackBot 🤖

Jogo para aprender **JavaScript do zero ao DOM** (com CSS e HTML no caminho). O aluno não responde perguntas: ele **programa um robô** para atravessar fases, derrotar bugs e batalhar na Arena.

## Rodar

```bash
npm install
npm start          # http://localhost:5177
npm test           # confere se as 25 fases têm solução 3 estrelas
```

Precisa de **Node 22.5+** (usa o SQLite embutido, `node:sqlite`). O banco fica em `data/hackbot.db`.

## O que tem

| Parte | Onde |
|---|---|
| 25 fases em 8 módulos: comandos → for → variáveis → strings → if/while → && \|\| → funções → parâmetros/return → arrays → objetos → CSS → HTML → DOM (querySelector, querySelectorAll, textContent, createElement, addEventListener) | `public/js/levels.js` |
| 21 aulas animadas com analogias (a Profa. Byte narra) | `public/js/lessons.js`, `public/js/lesson-player.js` |
| Simulador das fases + mini-DOM do mundo (roda num Web Worker) | `public/js/sim-core.js` |
| Moedas, loja (chapéus, pinturas, lasers, rastros), 19 conquistas, baú por módulo | `public/js/rewards.js` |
| Arena: rivais da campanha + **ranking online com Elo** e duelos | `public/js/arena.js`, `public/js/battle-core.js` |
| Servidor: contas (usuário, senha, curso), progresso salvo, ranking | `server/server.mjs` |

## Segurança do ranking

O código das IAs dos alunos roda no servidor dentro de um **sandbox QuickJS (WebAssembly)**, com limite de tempo e de memória. Ele não tem acesso a `process`, arquivos ou rede. Senhas usam `scrypt` com salt. A sessão fica num cookie `HttpOnly`. Há limite de tentativas no login e checagem de origem nas requisições que alteram dados.

### Usar na sala de aula (rede local / internet)

Por padrão o servidor só aceita conexões **desta máquina** (`127.0.0.1`). Para liberar para outros computadores:

```bash
HOST=0.0.0.0 npm start
```

Use isso **atrás de HTTPS** (ex.: Caddy ou nginx como proxy) e ative o cookie seguro com `COOKIE_SECURE=1`. Sem HTTPS, as senhas trafegam abertas na rede.

As batalhas do ranking rodam em *worker threads*, com no máximo 4 ao mesmo tempo e uma fila de 40. O ambiente do sandbox é congelado antes do código do aluno rodar, então um bot não consegue falsificar o resultado.

## Narração com ElevenLabs

Sem narração gerada, as aulas usam a voz do navegador (pt-BR). Para usar o ElevenLabs:

1. Crie `.env` na raiz do projeto:
   ```
   ELEVENLABS_API_KEY=sua_chave
   ELEVENLABS_VOICE_ID=id_da_voz   # opcional
   ```
2. `npm run narrar` gera os MP3 em `public/audio/` (só o que falta ou mudou).
   - `npm run narrar -- for` gera só a aula `for`.
   - `npm run narrar -- --force` regera tudo.

O jogo detecta os arquivos sozinho, por meio de `public/audio/manifest.json`.

## Adicionar uma fase

Crie um objeto em `levels.js` (mapa em texto, `par` = meta de linhas, `must` = regras de prática, `lesson` = aula). Depois escreva a solução em `tests/levels.test.mjs` e rode `npm test`.
