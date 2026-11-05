import { getDb } from "../db";
import { dataDaParcela, distribuirValoresParcelas, type ModoValorParcelas } from "./dbParcelamentos";

export type Receita = {
  id: number;
  nome: string;
  valor: number;
  tipo: string;
  data: string; // AAAA-MM-DD (data de entrada da receita)
  vencimento: string; // AAAA-MM-DD (data de vencimento)
  observacao: string | null;
  recebido: number; // 0 = a receber, 1 = já recebida (entra no saldo disponível)
  data_recebimento?: string | null;
  fixa: number;
  parcelas: number;
  numero_parcela: number;
  grupo_parcelas_id: number | null;
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
    "INSERT INTO receitas (nome, valor, tipo, data, vencimento, observacao, recebido, data_recebimento, fixa, parcelas, numero_parcela, banco_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)",
    [
      d.nome,
      d.valor,
      d.tipo,
      d.data,
      d.vencimento,
      d.observacao?.trim() || null,
      d.recebido ? 1 : 0,
      d.recebido ? dataHojeISO() : null,
      d.fixa ? 1 : 0,
      d.parcelas ?? 1,
      d.recebido ? d.bancoId ?? null : null,
    ]
  );
  return r.lastInsertRowId;
}

export async function inserirReceitasParceladas(
  d: DadosReceita,
  quantidade: number,
  modo: ModoValorParcelas
) {
  if (quantidade < 2 || !Number.isInteger(quantidade) || (d.valor <= 0)) {
    throw new Error("Informe um valor positivo e pelo menos duas parcelas.");
  }
  const valores = distribuirValoresParcelas(d.valor, quantidade, modo);
  const total = valores.reduce((soma, valor) => soma + valor, 0);
  const db = await getDb();
  let primeiraReceitaId = 0;
  await db.withTransactionAsync(async () => {
    const grupo = await db.runAsync(
      "INSERT INTO grupos_parcelas (natureza, nome, tipo, valor_total, quantidade, modo_valor) VALUES ('Receita', ?, ?, ?, ?, ?)",
      [d.nome, d.tipo, total, quantidade, modo]
    );
    for (let indice = 0; indice < quantidade; indice++) {
      const resultado = await db.runAsync(
        `INSERT INTO receitas (nome, valor, tipo, data, vencimento, observacao, recebido, data_recebimento, fixa, parcelas, banco_id, grupo_parcelas_id, numero_parcela)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
        [
          d.nome,
          valores[indice],
          d.tipo,
          d.data,
          dataDaParcela(d.vencimento, indice),
          d.observacao?.trim() || null,
          indice === 0 && d.recebido ? 1 : 0,
          indice === 0 && d.recebido ? dataHojeISO() : null,
          quantidade,
          indice === 0 && d.recebido ? d.bancoId ?? null : null,
          grupo.lastInsertRowId,
          indice + 1,
        ]
      );
      if (indice === 0) primeiraReceitaId = resultado.lastInsertRowId;
    }
  });
  return primeiraReceitaId;
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
  const atual = await db.getFirstAsync<{ grupo_parcelas_id: number | null }>("SELECT grupo_parcelas_id FROM receitas WHERE id = ?", [id]);
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      "UPDATE receitas SET nome = ?, valor = ?, tipo = ?, data = ?, vencimento = ?, observacao = ?, recebido = ?, data_recebimento = CASE WHEN ? = 1 THEN COALESCE(data_recebimento, ?) ELSE NULL END, fixa = ?, parcelas = ?, banco_id = ? WHERE id = ?",
      [d.nome, d.valor, d.tipo, d.data, d.vencimento, d.observacao?.trim() || null, d.recebido ? 1 : 0, d.recebido ? 1 : 0, dataHojeISO(), d.fixa ? 1 : 0, d.parcelas ?? 1, d.recebido ? d.bancoId ?? null : null, id]
    );
    if (atual?.grupo_parcelas_id) {
      await db.runAsync("UPDATE receitas SET nome = ?, tipo = ?, data = ? WHERE grupo_parcelas_id = ?", [d.nome, d.tipo, d.data, atual.grupo_parcelas_id]);
      const total = await db.getFirstAsync<{ total: number | null }>("SELECT SUM(valor) AS total FROM receitas WHERE grupo_parcelas_id = ?", [atual.grupo_parcelas_id]);
      await db.runAsync("UPDATE grupos_parcelas SET nome = ?, tipo = ?, valor_total = ? WHERE id = ?", [d.nome, d.tipo, total?.total ?? d.valor, atual.grupo_parcelas_id]);
    }
  });
}

// Liquida a receita: marca como recebida (passa a somar no saldo disponível)
export async function receberReceita(id: number, bancoId: number) {
  const db = await getDb();
  await db.runAsync("UPDATE receitas SET recebido = 1, banco_id = ?, data_recebimento = ? WHERE id = ?", [bancoId, dataHojeISO(), id]);
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
  const atual = await db.getFirstAsync<{ grupo_parcelas_id: number | null }>("SELECT grupo_parcelas_id FROM receitas WHERE id = ?", [id]);
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM receitas WHERE id = ?", [id]);
    if (!atual?.grupo_parcelas_id) return;
    const itens = await db.getAllAsync<{ id: number; valor: number }>("SELECT id, valor FROM receitas WHERE grupo_parcelas_id = ? ORDER BY numero_parcela, id", [atual.grupo_parcelas_id]);
    if (itens.length === 0) {
      await db.runAsync("DELETE FROM grupos_parcelas WHERE id = ?", [atual.grupo_parcelas_id]);
      return;
    }
    const total = itens.reduce((soma, item) => soma + item.valor, 0);
    await db.runAsync("UPDATE grupos_parcelas SET quantidade = ?, valor_total = ? WHERE id = ?", [itens.length, total, atual.grupo_parcelas_id]);
    for (let indice = 0; indice < itens.length; indice++) {
      await db.runAsync("UPDATE receitas SET numero_parcela = ?, parcelas = ? WHERE id = ?", [indice + 1, itens.length, itens[indice].id]);
    }
  });
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

function dataHojeISO() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}
