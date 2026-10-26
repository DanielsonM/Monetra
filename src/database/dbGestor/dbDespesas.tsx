import { somarUmMes } from "../../utils/converterData";
import { getDb } from "../db";

export type Despesa = {
  id: number;
  nome: string;
  valor: number;
  tipo: string;
  vencimento: string; // AAAA-MM-DD
  pago: number; // 0 = não pago, 1 = pago
  observacao: string | null;
  criado_em: string;
};

export async function inserirDespesa(
  d: Omit<Despesa, "id" | "criado_em" | "pago" | "observacao"> & {
    observacao?: string;
  }
) {
  const db = await getDb();
  const r = await db.runAsync(
    "INSERT INTO despesas (nome, valor, tipo, vencimento, observacao) VALUES (?, ?, ?, ?, ?)",
    [d.nome, d.valor, d.tipo, d.vencimento, d.observacao?.trim() || null]
  );
  return r.lastInsertRowId;
}

export async function listarDespesas(): Promise<Despesa[]> {
  const db = await getDb();
  return db.getAllAsync<Despesa>(
    "SELECT * FROM despesas ORDER BY vencimento ASC"
  );
}

// Despesas não pagas (de qualquer data) + as do mês atual em diante
export async function listarRecentes(limite = 5): Promise<Despesa[]> {
  const db = await getDb();
  return db.getAllAsync<Despesa>(
    `SELECT * FROM despesas
     WHERE pago = 0 OR vencimento >= date('now', 'localtime', 'start of month')
     ORDER BY vencimento ASC
     LIMIT ?`,
    [limite]
  );
}

// Marca como paga e empurra o vencimento para o mês seguinte
export async function pagarDespesa(id: number) {
  const db = await getDb();
  const d = await db.getFirstAsync<{ vencimento: string }>(
    "SELECT vencimento FROM despesas WHERE id = ?",
    [id]
  );
  if (!d) return;

  await db.runAsync(
    "UPDATE despesas SET pago = 1, vencimento = ? WHERE id = ?",
    [somarUmMes(d.vencimento), id]
  );
}

// Despesas pagas cujo novo vencimento já caiu no mês atual voltam a "não pago"
export async function renovarPendentes() {
  const db = await getDb();
  await db.runAsync(
    `UPDATE despesas SET pago = 0
     WHERE pago = 1
       AND vencimento < date('now', 'localtime', 'start of month', '+1 month')`
  );
}

export async function totalDespesas(): Promise<number> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ total: number | null }>(
    "SELECT SUM(valor) AS total FROM despesas"
  );
  return r?.total ?? 0;
}

export async function excluirDespesa(id: number) {
  const db = await getDb();
  await db.runAsync("DELETE FROM despesas WHERE id = ?", [id]);
}