# CineQuery

Assistente de consulta a banco de dados em linguagem natural, especializado em filmes. O usuário pergunta em português, como falaria com uma pessoa, e a aplicação converte a pergunta em uma query SQL, executa contra um banco de dados real (IMDb) e responde tanto em linguagem natural quanto com a query e os dados retornados.

## Motivação

Este projeto foi criado para explorar, de forma prática, a interseção entre dois pilares centrais no desenvolvimento de aplicações modernas: **SQL/bancos de dados relacionais** e **integração com IA generativa**. A proposta foi construir algo que exigisse pensar em modelagem de dados, engenharia de prompt, segurança na execução de código gerado por IA, e containerização para portabilidade do ambiente.

O domínio escolhido (filmes) usa dados reais do IMDb (IMDb Non-Commercial Datasets), não dados fictícios, para que as consultas geradas e os resultados tenham relevância genuína.

## Como funciona

```
Usuário digita uma pergunta
        ↓
Frontend envia a pergunta para a API (POST /api/query)
        ↓
Backend monta um prompt com o schema do banco + a pergunta
        ↓
Gemini API gera a query SQL correspondente
        ↓
Backend valida a query (somente SELECT, sem comandos destrutivos)
        ↓
Query é executada em modo somente leitura contra o banco SQLite
        ↓
Backend faz uma segunda chamada ao Gemini, para resumir o resultado
  em linguagem natural
        ↓
Frontend exibe: resposta em texto (chat) → SQL gerado → tabela de resultados
```

## Stack

- **Frontend/Backend:** Next.js (App Router) + TypeScript, Tailwind CSS
- **Banco de dados:** SQLite (via `better-sqlite3`), populado com dados do IMDb
- **IA generativa:** Google Gemini API (`gemini-3.6-flash` para geração de SQL, `gemini-flash-lite-latest` para o resumo em linguagem natural)
- **Containerização:** Docker

## Fonte de dados

Os dados são derivados dos **IMDb Non-Commercial Datasets** (disponíveis em https://datasets.imdbws.com/), usados sob a licença de uso pessoal e não comercial do IMDb. O banco local (`filmes.sqlite`) foi construído a partir de um script de importação (`lib/db/importar-imdb.ts`) que:

- Lê os arquivos `title.basics`, `title.ratings`, `title.crew` e `name.basics` (formato `.tsv.gz`) em streaming, sem carregar tudo em memória de uma vez
- Filtra apenas títulos do tipo `movie`
- Relaciona filmes aos seus diretores através de uma tabela de junção (`movie_directors`), permitindo consultas como "quais filmes X dirigiu?"

### Esquema do banco

```
movies (tconst, title, year, genres)
ratings (tconst, averageRating, numVotes)
people (nconst, name)
movie_directors (tconst, nconst)
```

> Information courtesy of IMDb (https://www.imdb.com). Used with permission.

## Decisões técnicas

### Segurança na execução de SQL gerado por IA

Como a query executada vem de um modelo de linguagem, e não diretamente do usuário nem do desenvolvedor, duas camadas de proteção foram implementadas:

1. **Validação de texto:** a query é rejeitada se não começar com `SELECT`, ou se contiver palavras-chave potencialmente destrutivas (`DROP`, `DELETE`, `INSERT`, `UPDATE`, `ALTER`, `ATTACH`, `PRAGMA`), mesmo que embutidas dentro de um `SELECT`.
2. **Conexão somente leitura:** a conexão com o banco é aberta com a flag `{ readonly: true }`. Isso significa que, mesmo que uma query maliciosa passasse pela validação de texto, o SQLite recusaria fisicamente qualquer tentativa de escrita.

### Limite de resultados

Cada consulta é limitada a no máximo 10 linhas retornadas ao usuário, tanto por instrução no prompt enviado ao Gemini (`LIMIT 10`) quanto por truncamento no backend, como segunda camada de garantia, independentemente do que o modelo gerar, o usuário nunca recebe mais que o limite definido.

### Ranking por nota ponderada (Bayesian weighted rating)

Perguntas sobre "melhores avaliados" originalmente ordenavam diretamente por `averageRating`, o que podia destacar títulos com nota alta mas poucos votos (ex: um filme com 3 avaliações e nota 9.1) acima de clássicos amplamente reconhecidos. Para corrigir isso, o prompt de geração de SQL instrui o modelo a calcular uma **nota ponderada bayesiana** — a mesma fórmula usada pelo IMDb em seu próprio ranking Top 250, em vez de usar a nota bruta:

```
WR = (v / (v + m)) × R + (m / (v + m)) × C
```

### Resiliência a instabilidade da API

Chamadas à API do Gemini podem falhar temporariamente com erro 503 (serviço sobrecarregado). A função de geração de SQL implementa retentativas automáticas com backoff exponencial (1s, 2s, 4s), limitadas a erros de disponibilidade, erros de cota excedida (429) não são reententados, já que retentar não resolveria o problema.

## Rodando localmente

### Pré-requisitos

- Node.js 22+
- Uma chave de API gratuita do Google Gemini ([AI Studio](https://aistudio.google.com/apikey))

### Passos

```bash
npm install
```

Crie um arquivo `.env.local` na raiz do projeto:

```
GEMINI_API_KEY=sua_chave_aqui
```

```bash
npm run dev
```

Acesse `http://localhost:3000`.

## Rodando com Docker

```bash
docker build -t cinequery --provenance=false .
docker run --rm -p 3000:3000 --env-file .env.local cinequery
```

Acesse `http://localhost:3000`.

## Exemplos de perguntas

- "quais os 5 filmes de comédia com melhor média de avaliação?"
- "quais filmes o Christopher Nolan dirigiu?"
- "quantos filmes de terror existem no catálogo?"

## Possíveis extensões futuras

- Deploy em nuvem (Oracle Cloud) com orquestração via Kubernetes
- Expansão do schema para incluir elenco e títulos regionais (`title.principals`, `title.akas`)

## Author
 
**Juliana Prado** — [Portfolio](https://jpradodev.com/)