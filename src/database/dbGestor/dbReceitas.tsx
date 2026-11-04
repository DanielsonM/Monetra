import { getDb } from "../db";

export type Receita = {
  id: number;
  nome: string;
  valor: number;
  tipo: string;
  data: string; // AAAA-MM-DD (data de entrada da receita)
  vencimento: string; // AAAA-MM-DD (data de vencimento)
  observacao: string | null;
  recebido: number; // 0 = a receber, 1 = já recebida (entra no saldo disponível)
  fixa: number;
  parcelas: number;
  banco_id: number | null;
  banco_nome?: string | null;
  banco_cor?: string | null;
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
  fixa?: boolean;
  parcelas?: number;
  bancoId?: number | null;
};

export async function inserirReceita(d: DadosReceita) {
  const db = await getDb();
  const r = await db.runAsync(
    "INSERT INTO receitas (nome, valor, tipo, data, vencimento, observacao, recebido, fixa, parcelas, banco_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      d.nome,
      d.valor,
      d.tipo,
      d.data,
      d.vencimento,
      d.observacao?.trim() || null,
      d.recebido ? 1 : 0,
      d.fixa ? 1 : 0,
      d.parcelas ?? 1,
      d.recebido ? d.bancoId ?? null : null,
    ]
  );
  return r.lastInsertRowId;
}

// Mais recentes primeiro (pela data de entrada)
export async function listarReceitas(): Promise<Receita[]> {
  const db = await getDb();
  return db.getAllAsync<Receita>(
    "SELECT r.*, b.nome AS banco_nome, b.cor AS banco_cor FROM receitas r LEFT JOIN bancos b ON b.id = r.banco_id ORDER BY r.data DESC, r.id DESC"
  );
}

// Busca uma receita pelo id (usado para abrir o cadastro em modo edição)
export async function buscarReceita(id: number): Promise<Receita | null> {
  const db = await getDb();
  return db.getFirstAsync<Receita>("SELECT r.*, b.nome AS banco_nome, b.cor AS banco_cor FROM receitas r LEFT JOIN bancos b ON b.id = r.banco_id WHERE r.id = ?", [
    id,
  ]);
}

export async function atualizarReceita(id: number, d: DadosReceita) {
  const db = await getDb();
  await db.runAsync(
    "UPDATE receitas SET nome = ?, valor = ?, tipo = ?, data = ?, vencimento = ?, observacao = ?, recebido = ?, fixa = ?, parcelas = ?, banco_id = ? WHERE id = ?",
    [
      d.nome,
      d.valor,
      d.tipo,
      d.data,
      d.vencimento,
      d.observacao?.trim() || null,
      d.recebido ? 1 : 0,
      d.fixa ? 1 : 0,
      d.parcelas ?? 1,
      d.recebido ? d.bancoId ?? null : null,
      id,
    ]
  );
}

// Liquida a receita: marca como recebida (passa a somar no saldo disponível)
export async function receberReceita(id: number, bancoId: number) {
  const db = await getDb();
  await db.runAsync("UPDATE receitas SET recebido = 1, banco_id = ? WHERE id = ?", [bancoId, id]);
}

export async function unificarReceitas(origemId: number, destinoId: number) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    const origem = await db.getFirstAsync<Receita>("SELECT * FROM receitas WHERE id = ? AND recebido = 0", [origemId]);
    const destino = await db.getFirstAsync<Receita>("SELECT * FROM receitas WHERE id = ? AND recebido = 0", [destinoId]);
    if (!origem || !destino || origem.id === destino.id) throw new Error("As receitas selecionadas não estão mais disponíveis.");
    const valor = origem.valor + destino.valor;
    const mensagem = `Unificada com ${origem.nome} (${origem.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}) em ${new Date().toLocaleDateString("pt-BR")}.`;
    const observacao = [destino.observacao?.trim(), mensagem].filter(Boolean).join("\n");
    await db.runAsync("UPDATE receitas SET valor = ?, observacao = ? WHERE id = ?", [valor, observacao, destino.id]);
    await db.runAsync("DELETE FROM receitas WHERE id = ?", [origem.id]);
    await db.runAsync("INSERT INTO unificacoes (natureza, nome_unificado, valor_unificado, nome_origem, valor_origem, nome_destino, valor_destino) VALUES (?, ?, ?, ?, ?, ?, ?)", ["Receita", destino.nome, valor, origem.nome, origem.valor, destino.nome, destino.valor]);
  });
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
