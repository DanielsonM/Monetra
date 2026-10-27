import { getDb } from "../db";

export type Receita = {
  id: number;
  nome: string;
  valor: number;
  tipo: string;
  vencimento: string; // AAAA-MM-DD (data prevista para a receita entrar)
  observacao: string | null;
  recebido: number; // 0 = a receber, 1 = já recebida (entra no saldo disponível)
  criado_em: string;
};

export type DadosReceita = {
  nome: string;
  valor: number;
  tipo: string;
  vencimento: string;
  observacao?: string;
  recebido?: boolean;
};

export async function inserirReceita(d: DadosReceita) {
  const db = await getDb();
  const r = await db.runAsync(
    "INSERT INTO receitas (nome, valor, tipo, vencimento, observacao, recebido) VALUES (?, ?, ?, ?, ?, ?)",
    [
      d.nome,
      d.valor,
      d.tipo,
      d.vencimento,
      d.observacao?.trim() || null,
      d.recebido ? 1 : 0,
    ]
  );
  return r.lastInsertRowId;
}

// Mais recentes primeiro
export async function listarReceitas(): Promise<Receita[]> {
  const db = await getDb();
  return db.getAllAsync<Receita>(
    "SELECT * FROM receitas ORDER BY vencimento DESC, id DESC"
  );
}

export async function atualizarReceita(id: number, d: DadosReceita) {
  const db = await getDb();
  await db.runAsync(
    "UPDATE receitas SET nome = ?, valor = ?, tipo = ?, vencimento = ?, observacao = ?, recebido = ? WHERE id = ?",
    [
      d.nome,
      d.valor,
      d.tipo,
      d.vencimento,
      d.observacao?.trim() || null,
      d.recebido ? 1 : 0,
      id,
    ]
  );
}

export async function excluirReceita(id: number) {
  const db = await getDb();
  await db.runAsync("DELETE FROM receitas WHERE id = ?", [id]);
}

// Soma de todas as receitas (recebidas ou não)
export async function totalReceitas(): Promise<number> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ total: number | null }>(
    "SELECT SUM(valor) AS total FROM receitas"
  );
  return r?.total ?? 0;
}

// Soma só das receitas já recebidas: é o valor que entra no saldo disponível
export async function totalReceitasRecebidas(): Promise<number> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ total: number | null }>(
    "SELECT SUM(valor) AS total FROM receitas WHERE recebido = 1"
  );
  return r?.total ?? 0;
}