import { getDb } from "../db";

export const TIPO_RECEITA_SAQUE = "Saque de aplicação";

export type Aplicacao = {
  id: number;
  banco: string;
  valor: number;
  criado_em: string;
};

export type DadosAplicacao = Pick<Aplicacao, "banco" | "valor">;

export async function inserirAplicacao(dados: DadosAplicacao) {
  const db = await getDb();
  const resultado = await db.runAsync(
    "INSERT INTO aplicacoes (banco, valor) VALUES (?, ?)",
    [dados.banco.trim(), dados.valor]
  );
  return resultado.lastInsertRowId;
}

export async function listarAplicacoes(): Promise<Aplicacao[]> {
  const db = await getDb();
  return db.getAllAsync<Aplicacao>("SELECT * FROM aplicacoes ORDER BY id DESC");
}

export async function buscarAplicacao(id: number): Promise<Aplicacao | null> {
  const db = await getDb();
  return db.getFirstAsync<Aplicacao>("SELECT * FROM aplicacoes WHERE id = ?", [id]);
}

export async function atualizarAplicacao(id: number, dados: DadosAplicacao) {
  const db = await getDb();
  await db.runAsync("UPDATE aplicacoes SET banco = ?, valor = ? WHERE id = ?", [
    dados.banco.trim(),
    dados.valor,
    id,
  ]);
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
      "SELECT * FROM aplicacoes WHERE id = ?",
      [aplicacaoId]
    );
    if (!aplicacao) throw new Error("Aplicação não encontrada.");
    if (valor > aplicacao.valor) throw new Error("O saque não pode ser maior que o saldo aplicado.");

    await db.runAsync("UPDATE aplicacoes SET valor = valor - ? WHERE id = ?", [valor, aplicacaoId]);

    const hoje = new Date();
    const data = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
    const receita = await db.runAsync(
      "INSERT INTO receitas (nome, valor, tipo, data, vencimento, observacao, recebido, fixa, parcelas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [`Saque de ${aplicacao.banco}`, valor, TIPO_RECEITA_SAQUE, data, data, `Saque da aplicação financeira ${aplicacao.banco}.`, 1, 0, 1]
    );
    receitaId = receita.lastInsertRowId;
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
    await db.runAsync("DELETE FROM aplicacoes WHERE id = ?", [origem.id]);
    await db.runAsync(
      "INSERT INTO unificacoes (natureza, nome_unificado, valor_unificado, nome_origem, valor_origem, nome_destino, valor_destino) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ["Aplicação", destino.banco, valorUnificado, origem.banco, origem.valor, destino.banco, destino.valor]
    );
  });
}
