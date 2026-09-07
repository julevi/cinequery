import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { gerarSQL, gerarRespostaTexto } from '@/lib/gemini';
import path from 'path';

const db = new Database(
  path.join(process.cwd(), 'lib', 'db', 'filmes.sqlite'),
  { readonly: true }
);

function validarSQL(sql: string): boolean {
  const sqlLimpo = sql.trim().toUpperCase();

  if (!sqlLimpo.startsWith('SELECT')) {
    return false;
  }

  const palavrasProibidas = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'ATTACH', 'PRAGMA'];
  const contemPalavraProibida = palavrasProibidas.some((palavra) =>
    sqlLimpo.includes(palavra)
  );

  return !contemPalavraProibida;
}

export async function POST(request: NextRequest) {
  try {
    const { pergunta } = await request.json();

    if (!pergunta || typeof pergunta !== 'string') {
      return NextResponse.json({ error: 'Pergunta inválida' }, { status: 400 });
    }

    const sqlGerado = await gerarSQL(pergunta);

    if (!validarSQL(sqlGerado)) {
      return NextResponse.json(
        { error: 'A query gerada não é segura para execução.', sql: sqlGerado },
        { status: 400 }
      );
    }

    const resultadoCompleto = db.prepare(sqlGerado).all();

    const LIMITE_MAX = 10;
    const foiTruncado = resultadoCompleto.length > LIMITE_MAX;
    const resultado = resultadoCompleto.slice(0, LIMITE_MAX);

    const respostaTexto = await gerarRespostaTexto(
      pergunta,
      resultado as Record<string, unknown>[]
    );

    return NextResponse.json({
      respostaTexto,
      sql: sqlGerado,
      resultado,
      truncado: foiTruncado,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Erro ao processar a pergunta.', detalhe: String(error) },
      { status: 500 }
    );
  }
}