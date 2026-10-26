import { getDb } from "../db";

export type Saldo = {
  id: number;
  valor: number;
  tipo: string;
  criado_em: string;
};

export async function inserirSaldo(s: Omit<Saldo, "id" | "criado_em">) {
  const db = await getDb();
  const r = await db.runAsync(
    "INSERT INTO saldos (valor, tipo) VALUES (?, ?)",
    [s.valor, s.tipo]
  );
  return r.lastInsertRowId;
}

export async function listarSaldos(): Promise<Saldo[]> {
  const db = await getDb();
  return db.getAllAsync<Saldo>("SELECT * FROM saldos ORDER BY id DESC");
}

// Soma de todos os saldos cadastrados (usada no card "Saldo disponível")
export async function totalSaldo(): Promise<number> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ total: number | null }>(
    "SELECT SUM(valor) AS total FROM saldos"
  );
  return r?.total ?? 0;
}

// Soma dos saldos de um tipo (ex.: "Salário")
export async function totalSaldoPorTipo(tipo: string): Promise<number> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ total: number | null }>(
    "SELECT SUM(valor) AS total FROM saldos WHERE tipo = ?",
    [tipo]
  );
  return r?.total ?? 0;
}

export async function excluirSaldo(id: number) {
  const db = await getDb();
  await db.runAsync("DELETE FROM saldos WHERE id = ?", [id]);
}
