import { getDb } from "../db";

export type Despesa = {
  id: number;
  nome: string;
  valor: number;
  tipo: string;
  vencimento: string; // AAAA-MM-DD
  pago: boolean;
  criado_em: string;
};

// No SQLite o campo "pago" é guardado como 0 ou 1
type LinhaDespesa = Omit<Despesa, "pago"> & { pago: number };

const paraDespesa = (l: LinhaDespesa): Despesa => ({
  ...l,
  pago: l.pago === 1,
});

// Garante que a coluna "pago" exista (migração automática, roda só uma vez).
// Usa uma Promise compartilhada para evitar rodar o ALTER TABLE em paralelo.
let garantia: Promise<void> | null = null;

function garantirColunaPago(): Promise<void> {
  if (!garantia) {
    garantia = (async () => {
      const db = await getDb();
      const colunas = await db.getAllAsync<{ name: string }>(
        "PRAGMA table_info(despesas)"
      );
      if (!colunas.some((c) => c.name === "pago")) {
        await db.execAsync(
          "ALTER TABLE despesas ADD COLUMN pago INTEGER NOT NULL DEFAULT 0"
        );
      }
    })().catch((erro) => {
      garantia = null; // permite tentar de novo se falhar
      throw erro;
    });
  }
  return garantia;
}

export async function inserirDespesa(
  d: Omit<Despesa, "id" | "criado_em" | "pago">
) {
  await garantirColunaPago();
  const db = await getDb();
  const r = await db.runAsync(
    "INSERT INTO despesas (nome, valor, tipo, vencimento, pago) VALUES (?, ?, ?, ?, 0)",
    [d.nome, d.valor, d.tipo, d.vencimento]
  );
  return r.lastInsertRowId;
}

export async function listarDespesas(): Promise<Despesa[]> {
  await garantirColunaPago();
  const db = await getDb();
  const linhas = await db.getAllAsync<LinhaDespesa>(
    "SELECT * FROM despesas ORDER BY vencimento ASC"
  );
  return linhas.map(paraDespesa);
}

// Últimas despesas cadastradas (usada na Home)
export async function listarRecentes(limite = 5): Promise<Despesa[]> {
  await garantirColunaPago();
  const db = await getDb();
  const linhas = await db.getAllAsync<LinhaDespesa>(
    "SELECT * FROM despesas ORDER BY id DESC LIMIT ?",
    [limite]
  );
  return linhas.map(paraDespesa);
}

// Marca ou desmarca uma despesa como paga
export async function definirPago(id: number, pago: boolean) {
  await garantirColunaPago();
  const db = await getDb();
  await db.runAsync("UPDATE despesas SET pago = ? WHERE id = ?", [
    pago ? 1 : 0,
    id,
  ]);
}

export async function totalDespesas(): Promise<number> {
  await garantirColunaPago();
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