import { getDb } from "../db";

export type OrcamentoCategoria = { tipo: string; limite: number };

export async function listarOrcamentos(): Promise<OrcamentoCategoria[]> {
  const db = await getDb();
  return db.getAllAsync<OrcamentoCategoria>(
    "SELECT tipo, limite FROM orcamentos ORDER BY tipo COLLATE NOCASE"
  );
}

export async function salvarOrcamento(tipo: string, limite: number) {
  const db = await getDb();
  if (limite <= 0) {
    await db.runAsync("DELETE FROM orcamentos WHERE tipo = ?", [tipo]);
    return;
  }
  await db.runAsync(
    `INSERT INTO orcamentos (tipo, limite) VALUES (?, ?)
     ON CONFLICT(tipo) DO UPDATE SET limite = excluded.limite`,
    [tipo, limite]
  );
}
