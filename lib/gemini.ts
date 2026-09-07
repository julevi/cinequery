import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SCHEMA = `
Tabelas do banco (dados do IMDb):

movies (
  tconst TEXT PRIMARY KEY,
  title TEXT,
  year INTEGER,
  genres TEXT              -- gêneros separados por vírgula, ex: "Action,Drama"
)

ratings (
  tconst TEXT PRIMARY KEY,  -- referencia movies.tconst
  averageRating REAL,        -- nota de 0 a 10
  numVotes INTEGER
)

people (
  nconst TEXT PRIMARY KEY,
  name TEXT                  -- nome do diretor
)

movie_directors (
  tconst TEXT,               -- referencia movies.tconst
  nconst TEXT                -- referencia people.nconst
)

Para perguntas sobre diretores, faça JOIN entre movies, movie_directors e people usando tconst e nconst.
`;

export async function gerarRespostaTexto(
  pergunta: string,
  resultado: Record<string, unknown>[]
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

  const amostra = JSON.stringify(resultado.slice(0, 10));

  const prompt = `
Você é um assistente que responde perguntas sobre filmes de forma breve e natural, como em uma conversa.

Pergunta do usuário: "${pergunta}"

Dados retornados do banco (JSON): ${amostra}

Regras:
- Responda em português, em 1 ou 2 frases curtas, como se estivesse conversando.
- NÃO use markdown, NÃO liste os dados em formato de tabela ou lista.
- Se a pergunta for apenas o nome de um filme (sem verbo/pedido explícito) e houver um resultado correspondente, apresente esse filme: ano, gênero, nota e diretor, como se estivesse descrevendo o filme para alguém.
- Se a pergunta parecer ser o nome de um filme mas não houver correspondência exata nos dados retornados, informe gentilmente que não encontrou esse título específico, e sugira o(s) resultado(s) mais próximo(s) encontrados, se houver.
- Caso contrário, resuma o que foi encontrado de forma natural (ex: "Encontrei os filmes X e Y, dirigidos por..." ou "Foram encontrados 5 filmes, com destaque para...").
- Se não houver resultados de fato, diga isso de forma gentil.

Resposta:
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return '';
  }
}

export async function gerarSQL(pergunta: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

 const prompt = `
Você é um assistente que converte perguntas em linguagem natural para queries SQL (dialeto SQLite).

${SCHEMA}

Regras importantes:
- Responda APENAS com a query SQL, nada mais.
- NÃO use markdown, NÃO use crases, NÃO explique nada.
- Use APENAS comandos SELECT. Nunca gere INSERT, UPDATE, DELETE ou DROP.
- SEMPRE inclua um LIMIT na query. Se a pergunta não especificar quantos resultados, use LIMIT 10. Nunca gere uma query sem LIMIT.
- Se a pergunta pedir mais de 10 resultados, gere a query com LIMIT 10 mesmo assim.
- SEMPRE que a pergunta envolver ranking por qualidade (nota, avaliação, "melhor", "pior", "mais bem avaliado", em qualquer idioma ou forma de expressão), NÃO ordene diretamente por averageRating. Em vez disso, calcule uma nota ponderada (Bayesian weighted rating), usando a fórmula:
  WR = (v / (v + m)) * R + (m / (v + m)) * C

  Onde:
  - R = r.averageRating
  - v = r.numVotes
  - m = 25000 (constante fixa)
  - C = (SELECT AVG(averageRating) FROM ratings) (subquery, média geral do catálogo)

  Use essa fórmula no SELECT como uma coluna calculada (ex: AS weightedRating) e ordene por ela em vez de averageRating diretamente. Isso evita destacar títulos obscuros com poucos votos.
- Quando a pergunta for sobre gênero/categoria (ex: comédia, terror, ação) SEM pedir ranking explícito por qualidade, ainda assim prefira ordenar pela nota ponderada (mesma fórmula acima) como critério padrão de relevância, salvo se a pergunta pedir outra ordem específica (ex: por ano, por nome).
- Quando a pergunta consistir apenas no nome (ou parte do nome) de um filme, sem verbo ou pedido explícito, interprete como um pedido de informações sobre esse filme. Gere uma query que busque na tabela movies usando LIKE '%trecho%' (case-insensitive, aceitando correspondência parcial), faça JOIN com ratings e com movie_directors + people para trazer também o(s) diretor(es), e retorne title, year, genres, averageRating, numVotes e o nome do diretor.
- Ao buscar um filme pelo título (em qualquer pergunta), NUNCA use = para comparação exata. Use SEMPRE LIKE '%trecho%' para tolerar erros de digitação, acentuação incorreta ou nomes incompletos. Se o nome digitado tiver múltiplas palavras, considere que a ordem ou grafia podem estar levemente erradas, e utilize os termos mais distintivos do nome no LIKE.
- Se a pergunta não puder ser respondida com os dados disponíveis, responda: SELECT 'PERGUNTA_INVALIDA' as erro;
- Ao buscar um filme pelo título, NUNCA use = para comparação exata, e NUNCA use a frase inteira digitada como um único LIKE. Em vez disso, identifique as 1-2 palavras mais distintivas do título (ignorando espaços/pontuação que possam variar) e busque cada uma separadamente com LIKE '%palavra%', combinando com AND. Por exemplo, para "dragon ball evolution", busque WHERE title LIKE '%dragon%' AND title LIKE '%evolution%' — isso tolera diferenças de espaçamento e pontuação entre as palavras.

Pergunta: "${pergunta}"

SQL:
`;
  const MAX_TENTATIVAS = 3;

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error: any) {
      const isServiceUnavailable = error?.status === 503;
      const ehUltimaTentativa = tentativa === MAX_TENTATIVAS;

      if (!isServiceUnavailable || ehUltimaTentativa) {
        throw error;
      }

      // espera crescente entre tentativas: 1s, 2s, 4s
      const esperaMs = 1000 * 2 ** (tentativa - 1);
      console.log(`Gemini 503 - tentativa ${tentativa}/${MAX_TENTATIVAS}, aguardando ${esperaMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, esperaMs));
    }
  }

  throw new Error('Falha ao gerar SQL após múltiplas tentativas.');
}