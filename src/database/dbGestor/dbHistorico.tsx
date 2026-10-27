import { getDb } from "../db";

export type ResumoMes = {
  mes: string; // AAAA-MM
  entradas: number;
  gastos: number;
  sobra: number;
};

export type GastoTipo = { tipo: string; total: number };

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