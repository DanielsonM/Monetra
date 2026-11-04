import { getDb } from "../db";
import { buscarBanco } from "./dbBancos";

export const TIPO_RECEITA_SAQUE = "Saque de aplicação";

export type Aplicacao = {
  id: number;
  banco: string;
  banco_id: number | null;
  banco_cor?: string | null;
  ultimo_saque_valor?: number | null;
  ultimo_saque_data?: string | null;
  valor: number;
  criado_em: string;
};

export type DadosAplicacao = { bancoId: number; valor: number };

export type SaqueAplicacao = {
  id: number;
  aplicacao_id: number | null;
  banco_id: number | null;
  banco_nome: string;
  banco_cor: string;
  valor: number;
  data: string;
  receita_id: number | null;
  criado_em: string;
};

export async function inserirAplicacao(dados: DadosAplicacao) {
  const db = await getDb();
  const banco = await buscarBanco(dados.bancoId);
  if (!banco) throw new Error("Selecione um banco cadastrado.");
  const resultado = await db.runAsync(
    "INSERT INTO aplicacoes (banco, banco_id, valor) VALUES (?, ?, ?)",
    [banco.nome, banco.id, dados.valor]
  );
  return resultado.lastInsertRowId;
}

export async function listarAplicacoes(): Promise<Aplicacao[]> {
  const db = await getDb();
  return db.getAllAsync<Aplicacao>(`SELECT a.*, COALESCE(b.nome, a.banco) AS banco, b.cor AS banco_cor,
    (SELECT s.valor FROM saques_aplicacoes s WHERE s.aplicacao_id = a.id ORDER BY s.id DESC LIMIT 1) AS ultimo_saque_valor,
    (SELECT s.data FROM saques_aplicacoes s WHERE s.aplicacao_id = a.id ORDER BY s.id DESC LIMIT 1) AS ultimo_saque_data
    FROM aplicacoes a LEFT JOIN bancos b ON b.id = a.banco_id ORDER BY a.id DESC`);
}

export async function buscarAplicacao(id: number): Promise<Aplicacao | null> {
  const db = await getDb();
  return db.getFirstAsync<Aplicacao>(`SELECT a.*, COALESCE(b.nome, a.banco) AS banco, b.cor AS banco_cor,
    (SELECT s.valor FROM saques_aplicacoes s WHERE s.aplicacao_id = a.id ORDER BY s.id DESC LIMIT 1) AS ultimo_saque_valor,
    (SELECT s.data FROM saques_aplicacoes s WHERE s.aplicacao_id = a.id ORDER BY s.id DESC LIMIT 1) AS ultimo_saque_data
    FROM aplicacoes a LEFT JOIN bancos b ON b.id = a.banco_id WHERE a.id = ?`, [id]);
}

export async function listarSaquesAplicacoes(aplicacaoId?: number, mes?: string): Promise<SaqueAplicacao[]> {
  const db = await getDb();
  const condicoes: string[] = [];
  const parametros: (string | number)[] = [];
  if (aplicacaoId !== undefined) { condicoes.push("aplicacao_id = ?"); parametros.push(aplicacaoId); }
  if (mes) { condicoes.push("substr(data, 1, 7) = ?"); parametros.push(mes); }
  const where = condicoes.length ? `WHERE ${condicoes.join(" AND ")}` : "";
  return db.getAllAsync<SaqueAplicacao>(`SELECT * FROM saques_aplicacoes ${where} ORDER BY data DESC, id DESC`, parametros);
}

export async function buscarUltimoSaqueAplicacao(): Promise<SaqueAplicacao | null> {
  const db = await getDb();
  return db.getFirstAsync<SaqueAplicacao>("SELECT * FROM saques_aplicacoes ORDER BY data DESC, id DESC LIMIT 1");
}

export async function atualizarAplicacao(id: number, dados: DadosAplicacao) {
  const db = await getDb();
  const banco = await buscarBanco(dados.bancoId);
  if (!banco) throw new Error("Selecione um banco cadastrado.");
  await db.runAsync("UPDATE aplicacoes SET banco = ?, banco_id = ?, valor = ? WHERE id = ?", [banco.nome, banco.id, dados.valor, id]);
}

export async function excluirAplicacao(id: number) {
  const db = await getDb();
  await db.runAsync("DELETE FROM aplicacoes WHERE id = ?", [id]);
}

export async function totalAplicacoes(): Promise<number> {
  const db = await getDb();
  const resultado = await db.getFirstAsync<{ total: number | null }>(
    "SELECT SUM(valor) AS total FROM aplicacoes"
  );
  return resultado?.total ?? 0;
}

export async function sacarAplicacao(aplicacaoId: number, valor: number) {
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error("Informe um valor de saque maior que zero.");
  }

  const db = await getDb();
  let receitaId = 0;
  await db.withTransactionAsync(async () => {
    const aplicacao = await db.getFirstAsync<Aplicacao>(
      "SELECT a.*, b.nome AS banco, b.cor AS banco_cor FROM aplicacoes a LEFT JOIN bancos b ON b.id = a.banco_id WHERE a.id = ?",
      [aplicacaoId]
    );
    if (!aplicacao) throw new Error("Aplicação não encontrada.");
    if (valor > aplicacao.valor) throw new Error("O saque não pode ser maior que o saldo aplicado.");

    await db.runAsync("UPDATE aplicacoes SET valor = valor - ? WHERE id = ?", [valor, aplicacaoId]);

    const hoje = new Date();
    const data = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
    const receita = await db.runAsync(
      "INSERT INTO receitas (nome, valor, tipo, data, vencimento, observacao, recebido, fixa, parcelas, banco_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [`Saque de ${aplicacao.banco}`, valor, TIPO_RECEITA_SAQUE, data, data, `Saque da aplicação financeira ${aplicacao.banco}.`, 1, 0, 1, aplicacao.banco_id]
    );
    receitaId = receita.lastInsertRowId;
    await db.runAsync(
      "INSERT INTO saques_aplicacoes (aplicacao_id, banco_id, banco_nome, banco_cor, valor, data, receita_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [aplicacao.id, aplicacao.banco_id, aplicacao.banco, aplicacao.banco_cor || "#1565C0", valor, data, receitaId]
    );
  });

  return receitaId;
}

export async function unificarAplicacoes(origemId: number, destinoId: number) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    const origem = await db.getFirstAsync<Aplicacao>("SELECT * FROM aplicacoes WHERE id = ?", [origemId]);
    const destino = await db.getFirstAsync<Aplicacao>("SELECT * FROM aplicacoes WHERE id = ?", [destinoId]);
    if (!origem || !destino || origem.id === destino.id) {
      throw new Error("Selecione duas aplicações diferentes para unificar.");
    }

    const valorUnificado = origem.valor + destino.valor;
    await db.runAsync("UPDATE aplicacoes SET valor = ? WHERE id = ?", [valorUnificado, destino.id]);
    await db.runAsync("UPDATE saques_aplicacoes SET aplicacao_id = ? WHERE aplicacao_id = ?", [destino.id, origem.id]);
    await db.runAsync("DELETE FROM aplicacoes WHERE id = ?", [origem.id]);
    await db.runAsync(
      "INSERT INTO unificacoes (natureza, nome_unificado, valor_unificado, nome_origem, valor_origem, nome_destino, valor_destino) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ["Aplicação", destino.banco, valorUnificado, origem.banco, origem.valor, destino.banco, destino.valor]
    );
  });
}
