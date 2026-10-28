import { getDb } from "../db";

// Salário é dinheiro garantido: sempre conta como recebido (entra no saldo)
export const TIPO_SALARIO = "Salário";

const contaComoRecebido = (d: { tipo: string; recebido?: boolean }) =>
  d.tipo === TIPO_SALARIO || d.recebido ? 1 : 0;

export type Receita = {
  id: number;
  nome: string;
  valor: number;
  tipo: string;
  data: string; // AAAA-MM-DD (data de entrada da receita)
  vencimento: string; // AAAA-MM-DD (data de vencimento)
  observacao: string | null;
  recebido: number; // 0 = a receber, 1 = já recebida (entra no saldo disponível)
  criado_em: string;
};

export type DadosReceita = {
  nome: string;
  valor: number;
  tipo: string;
  data: string;
  vencimento: string;
  observacao?: string;
  recebido?: boolean;
};

export async function inserirReceita(d: DadosReceita) {
  const db = await getDb();
  const r = await db.runAsync(
    "INSERT INTO receitas (nome, valor, tipo, data, vencimento, observacao, recebido) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      d.nome,
      d.valor,
      d.tipo,
      d.data,
      d.vencimento,
      d.observacao?.trim() || null,
      contaComoRecebido(d),
    ]
  );
  return r.lastInsertRowId;
}

// Mais recentes primeiro (pela data de entrada)
export async function listarReceitas(): Promise<Receita[]> {
  const db = await getDb();
  return db.getAllAsync<Receita>(
    "SELECT * FROM receitas ORDER BY data DESC, id DESC"
  );
}

// Busca uma receita pelo id (usado para abrir o cadastro em modo edição)
export async function buscarReceita(id: number): Promise<Receita | null> {
  const db = await getDb();
  return db.getFirstAsync<Receita>("SELECT * FROM receitas WHERE id = ?", [
    id,
  ]);
}

export async function atualizarReceita(id: number, d: DadosReceita) {
  const db = await getDb();
  await db.runAsync(
    "UPDATE receitas SET nome = ?, valor = ?, tipo = ?, data = ?, vencimento = ?, observacao = ?, recebido = ? WHERE id = ?",
    [
      d.nome,
      d.valor,
      d.tipo,
      d.data,
      d.vencimento,
      d.observacao?.trim() || null,
      contaComoRecebido(d),
      id,
    ]
  );
}

// Liquida a receita: marca como recebida (passa a somar no saldo disponível)
export async function receberReceita(id: number) {
  const db = await getDb();
  await db.runAsync("UPDATE receitas SET recebido = 1 WHERE id = ?", [id]);
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