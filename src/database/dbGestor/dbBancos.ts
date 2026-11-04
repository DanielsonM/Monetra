import { getDb } from "../db";

export type Banco = {
  id: number;
  nome: string;
  cor: string;
  criado_em: string;
};

export type DadosBanco = Pick<Banco, "nome" | "cor">;

export async function listarBancos(): Promise<Banco[]> {
  const db = await getDb();
  return db.getAllAsync<Banco>("SELECT * FROM bancos ORDER BY nome COLLATE NOCASE");
}

export async function buscarBanco(id: number): Promise<Banco | null> {
  const db = await getDb();
  return db.getFirstAsync<Banco>("SELECT * FROM bancos WHERE id = ?", [id]);
}

export async function inserirBanco(dados: DadosBanco) {
  const db = await getDb();
  const resultado = await db.runAsync(
    "INSERT INTO bancos (nome, cor) VALUES (?, ?)",
    [dados.nome.trim(), dados.cor]
  );
  return resultado.lastInsertRowId;
}

export async function atualizarBanco(id: number, dados: DadosBanco) {
  const db = await getDb();
  await db.runAsync("UPDATE bancos SET nome = ?, cor = ? WHERE id = ?", [dados.nome.trim(), dados.cor, id]);
  await db.runAsync("UPDATE aplicacoes SET banco = ? WHERE banco_id = ?", [dados.nome.trim(), id]);
}
