import { getDb } from "../db";

export type ResumoMes = {
  mes: string; // AAAA-MM
  entradas: number;
  gastos: number;
  sobra: number;
};

export type GastoTipo = { tipo: string; total: number };
export type UnificacaoHistorico = { id: number; natureza: string; nome_unificado: string; valor_unificado: number; nome_origem: string; valor_origem: number; nome_destino: string; valor_destino: number; data_unificacao: string };

export async function listarUnificacoes(): Promise<UnificacaoHistorico[]> {
  const db = await getDb();
  return db.getAllAsync<UnificacaoHistorico>("SELECT * FROM unificacoes ORDER BY id DESC");
}

export type CategoriaPlanejada = {
  tipo: string;
  pago: number;
  pendente: number;
  total: number;
};

export type PlanejamentoMes = {
  receitasRecebidas: number;
  receitasAReceber: number;
  salarioRecebido: number;
  salarioAReceber: number;
  despesasPagas: number;
  despesasAPagar: number;
  categorias: CategoriaPlanejada[];
};

// Projeção do mês: receitas já recebidas e previstas, menos pagamentos
// registrados no mês e despesas ainda pendentes com vencimento nesse mês.
export async function planejamentoDoMes(mes: string): Promise<PlanejamentoMes> {
  const db = await getDb();

  const [recebidas, aReceber, salarioRecebido, salarioAReceber, pagas, pendentes, pagasPorTipo, pendentesPorTipo] =
    await Promise.all([
      db.getFirstAsync<{ total: number | null }>(
        "SELECT SUM(valor) AS total FROM receitas WHERE recebido = 1 AND substr(data, 1, 7) = ?",
        [mes]
      ),
      db.getFirstAsync<{ total: number | null }>(
        "SELECT SUM(valor) AS total FROM receitas WHERE recebido = 0 AND substr(vencimento, 1, 7) = ?",
        [mes]
      ),
      db.getFirstAsync<{ total: number | null }>(
        "SELECT SUM(valor) AS total FROM receitas WHERE recebido = 1 AND tipo = 'Salário' AND substr(data, 1, 7) = ?",
        [mes]
      ),
      db.getFirstAsync<{ total: number | null }>(
        "SELECT SUM(valor) AS total FROM receitas WHERE recebido = 0 AND tipo = 'Salário' AND substr(vencimento, 1, 7) = ?",
        [mes]
      ),
      db.getFirstAsync<{ total: number | null }>(
        "SELECT SUM(valor) AS total FROM pagamentos WHERE substr(data_pagamento, 1, 7) = ?",
        [mes]
      ),
      db.getFirstAsync<{ total: number | null }>(
        "SELECT SUM(valor) AS total FROM despesas WHERE pago = 0 AND substr(vencimento, 1, 7) = ?",
        [mes]
      ),
      db.getAllAsync<GastoTipo>(
        `SELECT tipo, SUM(valor) AS total FROM pagamentos
         WHERE substr(data_pagamento, 1, 7) = ? GROUP BY tipo`,
        [mes]
      ),
      db.getAllAsync<GastoTipo>(
        `SELECT tipo, SUM(valor) AS total FROM despesas
         WHERE pago = 0 AND substr(vencimento, 1, 7) = ? GROUP BY tipo`,
        [mes]
      ),
    ]);

  const categorias = new Map<string, CategoriaPlanejada>();
  for (const item of pagasPorTipo) {
    categorias.set(item.tipo, {
      tipo: item.tipo,
      pago: item.total,
      pendente: 0,
      total: item.total,
    });
  }
  for (const item of pendentesPorTipo) {
    const categoria = categorias.get(item.tipo) ?? {
      tipo: item.tipo,
      pago: 0,
      pendente: 0,
      total: 0,
    };
    categoria.pendente = item.total;
    categoria.total += item.total;
    categorias.set(item.tipo, categoria);
  }

  return {
    receitasRecebidas: recebidas?.total ?? 0,
    receitasAReceber: aReceber?.total ?? 0,
    salarioRecebido: salarioRecebido?.total ?? 0,
    salarioAReceber: salarioAReceber?.total ?? 0,
    despesasPagas: pagas?.total ?? 0,
    despesasAPagar: pendentes?.total ?? 0,
    categorias: [...categorias.values()].sort((a, b) => b.total - a.total),
  };
}

// Lista de meses "AAAA-MM", do mais antigo ao atual
export function ultimosMeses(qtd: number): string[] {
  const hoje = new Date();
  const lista: string[] = [];

  for (let i = qtd - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    lista.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }
  return lista;
}

// Entradas (saldos cadastrados) e gastos (pagamentos) de cada mês
export async function resumoPorMes(qtd = 12): Promise<ResumoMes[]> {
  const db = await getDb();
  const meses = ultimosMeses(qtd);
  const inicio = meses[0];

  const entradas = await db.getAllAsync<{ mes: string; total: number }>(
    `SELECT substr(criado_em, 1, 7) AS mes, SUM(valor) AS total
     FROM saldos
     WHERE substr(criado_em, 1, 7) >= ?
     GROUP BY mes`,
    [inicio]
  );

  const gastos = await db.getAllAsync<{ mes: string; total: number }>(
    `SELECT substr(data_pagamento, 1, 7) AS mes, SUM(valor) AS total
     FROM pagamentos
     WHERE substr(data_pagamento, 1, 7) >= ?
     GROUP BY mes`,
    [inicio]
  );

  return meses.map((mes) => {
    const e = entradas.find((x) => x.mes === mes)?.total ?? 0;
    const g = gastos.find((x) => x.mes === mes)?.total ?? 0;
    return { mes, entradas: e, gastos: g, sobra: e - g };
  });
}

// Quanto foi gasto em cada tipo de despesa em um mês ("AAAA-MM")
export async function gastosPorTipo(mes: string): Promise<GastoTipo[]> {
  const db = await getDb();
  return db.getAllAsync<GastoTipo>(
    `SELECT tipo, SUM(valor) AS total
     FROM pagamentos
     WHERE substr(data_pagamento, 1, 7) = ?
     GROUP BY tipo
     ORDER BY total DESC`,
    [mes]
  );
}
