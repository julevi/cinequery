'use client';

import { useState } from 'react';

interface Resultado {
  respostaTexto?: string;
  sql?: string;
  resultado?: Record<string, unknown>[];
  error?: string;
  truncado?: boolean;
}

const EXEMPLOS = [
  'filmes de ficção científica mais bem avaliados',
  'quantos filmes de terror existem no catálogo?',
  'top 5 comédias por média de nota',
];

export default function Home() {
  const [pergunta, setPergunta] = useState('');
  const [loading, setLoading] = useState(false);
  const [resposta, setResposta] = useState<Resultado | null>(null);

  async function consultar(texto: string) {
    if (!texto.trim()) return;
    setLoading(true);
    setResposta(null);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta: texto }),
      });
      const data = await res.json();
      setResposta(data);
    } catch {
      setResposta({ error: 'Não foi possível conectar ao servidor.' });
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    consultar(pergunta);
  }

  const colunas =
    resposta?.resultado && resposta.resultado.length > 0
      ? Object.keys(resposta.resultado[0])
      : [];


  return (
    <main className="min-h-screen bg-[#0E0D0F] text-[#F2EFE9]">
      {/* Letreiro / hero */}
      <div className="border-b border-[#2A2830] px-6 py-5 sm:py-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-xs tracking-[0.2em] text-[#8A8790]">
            catálogo de filmes · consulta em linguagem natural
          </p>
          <h1 className="font-serif text-5xl text-[#E8B14C] sm:text-6xl">
            CineQuery
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-[#B8B5BE]">
            Pergunte sobre filmes e avaliações como você falaria com alguém, a IA traduz
            sua pergunta em SQL e busca a resposta em um catálogo real do IMDb. <br />
            No momento, o catálogo cobre apenas filmes e seus diretores.
          </p>
        </div>
      </div>

      {/* Consulta */}
      <div className="mx-auto max-w-2xl px-6 py-12">
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              placeholder="quais os filmes de comédia mais bem avaliados?"
              className="flex-1 rounded-sm border border-[#3A3740] bg-[#17151A] px-4 py-3 text-[15px] text-[#F2EFE9] placeholder:text-[#63606A] focus:border-[#E8B14C] focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-sm bg-[#E8B14C] px-6 py-3 text-[15px] font-medium text-[#0E0D0F] transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {loading ? 'Consultando' : 'Perguntar'}
            </button>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {EXEMPLOS.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setPergunta(ex);
                consultar(ex);
              }}
              className="rounded-sm border border-[#3A3740] px-3 py-1.5 text-xs text-[#B8B5BE] transition-colors hover:border-[#E8B14C] hover:text-[#E8B14C]"
            >
              {ex}
            </button>
          ))}
        </div>

        {resposta?.error && (
          <div className="mt-8 border-l-2 border-[#C0625A] bg-[#1E1518] px-4 py-3 text-sm text-[#E8A39D]">
            {resposta.error}
          </div>
        )}


        {resposta?.respostaTexto && (
          <div className="mt-8 flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E8B14C] text-xs font-semibold text-[#0E0D0F]">
              AI
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-[#2A2830] bg-[#1A1820] px-4 py-3 text-[15px] leading-relaxed text-[#D8D5DE]">
              {resposta.respostaTexto}
            </div>
          </div>
        )}
        {resposta?.sql && (
          <div className="mt-10">
            <p className="mb-2 text-xs tracking-[0.15em] text-[#63606A]">
              query gerada
            </p>
            <pre className="overflow-x-auto rounded-sm border border-[#2A2830] bg-[#141216] px-4 py-3 font-mono text-[13px] leading-relaxed text-[#7FA88A]">
              {resposta.sql}
            </pre>
          </div>
        )}

        {resposta?.resultado && (
          <div className="mt-8">
            <p className="mb-2 text-xs tracking-[0.15em] text-[#63606A]">
              {resposta.resultado.length} resultado
              {resposta.resultado.length !== 1 ? 's' : ''}
            </p>

            {resposta.truncado && (
              <p className="mb-3 text-sm text-[#E8B14C]">
                Infelizmente não é possível processar mais de 10 resultados. Mostrando os 10 primeiros.
              </p>
            )}

            <div className="overflow-x-auto border-t border-[#2A2830]">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#2A2830] text-[#8A8790]">
                    {colunas.map((col) => (
                      <th key={col} className="py-2 pr-6 font-normal">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resposta.resultado.map((linha, i) => (
                    <tr
                      key={i}
                      className="border-b border-[#1D1B20] text-[#D8D5DE]"
                    >
                      {colunas.map((col) => (
                        <td key={col} className="py-2.5 pr-6">
                          {String(linha[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {resposta?.resultado && resposta.resultado.length === 0 && (
          <p className="mt-8 text-sm text-[#63606A]">
            Nenhum resultado encontrado. Tente reformular a pergunta.
          </p>
        )}
      </div>
      <footer className="border-t border-[#2A2830] px-6 py-6 text-center text-xs text-[#63606A]">

        <p className="text-xs">© 2026 CineQuery by <a
          href="https://jpradodev.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors underline underline-offset-2"
        >
          Juliana Prado
        </a></p>
        <p className="text-xs text-white/50">

        </p>

        Information courtesy of IMDb (https://www.imdb.com). Used with permission.
      </footer>
    </main>

  );
}