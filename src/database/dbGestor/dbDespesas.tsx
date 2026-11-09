import { somarUmMes } from "../../utils/converterData";
import { getDb } from "../db";
import { lerTags } from "./dbTags";
import { totalReceitasRecebidas } from "./dbReceitas";
import { dataDaParcela, distribuirValoresParcelas, type ModoValorParcelas } from "./dbParcelamentos";

export type Despesa = {
  id: number;
  nome: string;
  valor: number;
  provisao: string; // AAAA-MM-DD
  data_emissao: string;
  pago: number; // 0 = não pago, 1 = pago
  observacao: string | null;
  fixa: number; // 0 = única, 1 = fixa (repete todo mês até ser removida)
  frequencia: "semanal" | "mensal" | "anual";
  parcelas: number;
  numero_parcela: number;
  grupo_parcelas_id: number | null;
  valor_pago: number;
  tags_ids: string;
  criado_em: string;
};

export type DadosNovaDespesa = {
  nome: string;
  valor: number;
  provisao: string;
  data_emissao?: string;
  observacao?: string;
  fixa?: boolean;
  frequencia?: "semanal" | "mensal" | "anual";
  parcelas?: number;
  tagsIds?: number[];
};

export async function inserirDespesa(d: DadosNovaDespesa) {
  const db = await getDb();
  const r = await db.runAsync(
    "INSERT INTO despesas (nome, valor, tipo, provisao, data_emissao, observacao, fixa, frequencia, parcelas, tags_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      d.nome,
      d.valor,
      "",
      d.provisao,
      d.data_emissao ?? dataHojeISO(),
      d.observacao?.trim() || null,
      d.fixa ? 1 : 0,
      d.frequencia ?? "mensal",
      d.parcelas ?? 1,
      JSON.stringify(d.tagsIds ?? []),
    ]
  );
  return r.lastInsertRowId;
}

export async function inserirDespesasParceladas(
  d: DadosNovaDespesa,
  quantidade: number,
  modo: ModoValorParcelas
) {
  if (quantidade < 2 || !Number.isInteger(quantidade) || d.valor <= 0) {
    throw new Error("Informe um valor positivo e pelo menos duas parcelas.");
  }
  const valores = distribuirValoresParcelas(d.valor, quantidade, modo);
  const total = valores.reduce((soma, valor) => soma + valor, 0);
  const db = await getDb();
  let primeiraDespesaId = 0;
  await db.withTransactionAsync(async () => {
    const grupo = await db.runAsync(
      "INSERT INTO grupos_parcelas (natureza, nome, tipo, valor_total, quantidade, modo_valor, data_emissao) VALUES ('Despesa', ?, ?, ?, ?, ?, ?)",
      [d.nome, "", total, quantidade, modo, d.data_emissao ?? dataHojeISO()]
    );
    for (let indice = 0; indice < quantidade; indice++) {
      const resultado = await db.runAsync(
        `INSERT INTO despesas (nome, valor, tipo, provisao, data_emissao, observacao, fixa, frequencia, parcelas, numero_parcela, grupo_parcelas_id, tags_ids)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
        [
          d.nome,
          valores[indice],
          "",
          dataDaParcela(d.provisao, indice),
          d.data_emissao ?? dataHojeISO(),
          d.observacao?.trim() || null,
          d.frequencia ?? "mensal",
          quantidade,
          indice + 1,
          grupo.lastInsertRowId,
          JSON.stringify(d.tagsIds ?? []),
        ]
      );
      if (indice === 0) primeiraDespesaId = resultado.lastInsertRowId;
    }
  });
  return primeiraDespesaId;
}

export async function listarDespesas(): Promise<Despesa[]> {
  const db = await getDb();
  return db.getAllAsync<Despesa>(
    "SELECT * FROM despesas ORDER BY provisao ASC"
  );
}

// Busca uma despesa pelo id (usado para abrir o cadastro em modo edição)
export async function buscarDespesa(id: number): Promise<Despesa | null> {
  const db = await getDb();
  return db.getFirstAsync<Despesa>("SELECT * FROM despesas WHERE id = ?", [
    id,
  ]);
}

// Atualiza os dados de uma despesa já cadastrada.
// Não mexe no campo "pago": o pagamento continua sendo feito por pagarDespesa.
export async function atualizarDespesa(
  id: number,
  d: {
    nome: string;
    valor: number;
    provisao: string;
    data_emissao?: string;
    observacao?: string;
    fixa?: boolean;
    frequencia?: "semanal" | "mensal" | "anual";
    parcelas?: number;
    tagsIds?: number[];
  }
) {
  const db = await getDb();
  const atual = await db.getFirstAsync<{ grupo_parcelas_id: number | null }>("SELECT grupo_parcelas_id FROM despesas WHERE id = ?", [id]);
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      "UPDATE despesas SET nome = ?, valor = ?, provisao = ?, data_emissao = ?, observacao = ?, fixa = ?, frequencia = ?, parcelas = ?, tags_ids = ? WHERE id = ?",
      [d.nome, d.valor, d.provisao, d.data_emissao ?? dataHojeISO(), d.observacao?.trim() || null, d.fixa ? 1 : 0, d.frequencia ?? "mensal", d.parcelas ?? 1, JSON.stringify(d.tagsIds ?? []), id]
    );
    if (atual?.grupo_parcelas_id) {
      await db.runAsync("UPDATE despesas SET nome = ?, data_emissao = ?, tags_ids = ? WHERE grupo_parcelas_id = ?", [d.nome, d.data_emissao ?? dataHojeISO(), JSON.stringify(d.tagsIds ?? []), atual.grupo_parcelas_id]);
      const total = await db.getFirstAsync<{ total: number | null }>("SELECT SUM(valor) AS total FROM despesas WHERE grupo_parcelas_id = ?", [atual.grupo_parcelas_id]);
      await db.runAsync("UPDATE grupos_parcelas SET nome = ?, tipo = '', valor_total = ? WHERE id = ?", [d.nome, total?.total ?? d.valor, atual.grupo_parcelas_id]);
    }
  });
}

// Despesas não pagas (de qualquer data) + as do mês atual em diante
export async function listarRecentes(limite = 5): Promise<Despesa[]> {
  const db = await getDb();
  return db.getAllAsync<Despesa>(
    `SELECT * FROM despesas
     WHERE pago = 0 OR provisao >= date('now', 'localtime', 'start of month')
     ORDER BY provisao ASC
     LIMIT ?`,
    [limite]
  );
}

// Registra a quitação do valor restante no histórico e marca como paga.
// Se for despesa fixa, empurra a provisão para o próximo período
// (tudo junto: ou grava tudo, ou nada)
export async function pagarDespesa(id: number) {
  const db = await getDb();
  const d = await db.getFirstAsync<Despesa>(
    "SELECT * FROM despesas WHERE id = ?",
    [id]
  );
  if (!d) return;

  await registrarPagamento(id, Math.max(0, d.valor - (d.valor_pago ?? 0)));
}

// Registra um pagamento parcial ou a quitação do saldo pendente.
export async function registrarPagamentoDespesa(id: number, valor: number) {
  const db = await getDb();
  const d = await db.getFirstAsync<Despesa>("SELECT * FROM despesas WHERE id = ?", [id]);
  if (!d || d.pago) throw new Error("Esta despesa não está pendente.");
  const pendente = Math.max(0, d.valor - (d.valor_pago ?? 0));
  if (!Number.isFinite(valor) || valor <= 0 || valor > pendente + 0.005) {
    throw new Error("Informe um valor maior que zero e igual ou menor que o saldo pendente.");
  }
  const [entradas, saidas] = await Promise.all([
    totalReceitasRecebidas(),
    totalDespesasPagas(),
  ]);
  if (valor > Math.max(0, entradas - saidas) + 0.005) {
    throw new Error("Saldo disponível insuficiente para realizar este pagamento.");
  }
  await registrarPagamento(id, Math.min(valor, pendente));
}

async function registrarPagamento(id: number, valor: number) {
  const db = await getDb();
  const d = await db.getFirstAsync<Despesa>("SELECT * FROM despesas WHERE id = ?", [id]);
  if (!d || d.pago || valor <= 0) return;
  await db.withTransactionAsync(async () => {
    const totalPago = (d.valor_pago ?? 0) + valor;
    await db.runAsync(
      "INSERT INTO pagamentos (despesa_id, nome, tipo, valor, provisao, tags_ids) VALUES (?, ?, ?, ?, ?, ?)",
      [d.id, d.nome, "", valor, d.provisao, d.tags_ids ?? "[]"]
    );
    if (totalPago + 0.005 >= d.valor) {
      if (d.fixa) {
        const proximaProvisao = somarFrequencia(d.provisao, d.frequencia);
        await db.runAsync("UPDATE despesas SET pago = 1, valor_pago = ?, provisao = ? WHERE id = ?", [d.valor, proximaProvisao, id]);
      } else {
        await db.runAsync("UPDATE despesas SET pago = 1, valor_pago = ? WHERE id = ?", [d.valor, id]);
      }
    } else {
      await db.runAsync("UPDATE despesas SET valor_pago = ? WHERE id = ?", [totalPago, id]);
    }
  });
}

export async function unificarDespesas(origemId: number, destinoId: number) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    const origem = await db.getFirstAsync<Despesa>("SELECT * FROM despesas WHERE id = ? AND pago = 0", [origemId]);
    const destino = await db.getFirstAsync<Despesa>("SELECT * FROM despesas WHERE id = ? AND pago = 0", [destinoId]);
    if (!origem || !destino || origem.id === destino.id) throw new Error("As despesas selecionadas não estão mais disponíveis.");
    const valor = origem.valor + destino.valor;
    const valorPago = (origem.valor_pago ?? 0) + (destino.valor_pago ?? 0);
    const tagsIds = [...new Set([...lerTags(destino.tags_ids), ...lerTags(origem.tags_ids)])];
    const mensagem = `Unificada com ${origem.nome} (${origem.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}) em ${new Date().toLocaleDateString("pt-BR")}.`;
    const observacao = [destino.observacao?.trim(), mensagem].filter(Boolean).join("\n");
    await db.runAsync("UPDATE despesas SET valor = ?, valor_pago = ?, observacao = ?, tags_ids = ? WHERE id = ?", [valor, valorPago, observacao, JSON.stringify(tagsIds), destino.id]);
    await db.runAsync("DELETE FROM despesas WHERE id = ?", [origem.id]);
    await db.runAsync("INSERT INTO unificacoes (natureza, nome_unificado, valor_unificado, nome_origem, valor_origem, nome_destino, valor_destino) VALUES (?, ?, ?, ?, ?, ?, ?)", ["Despesa", destino.nome, valor, origem.nome, origem.valor, destino.nome, destino.valor]);
  });
}

function somarFrequencia(data: string, frequencia: Despesa["frequencia"]): string {
  if (frequencia === "mensal") return somarUmMes(data);
  const [ano, mes, dia] = data.split("-").map(Number);
  let proxima: Date;
  if (frequencia === "semanal") {
    proxima = new Date(ano, mes - 1, dia + 7);
  } else {
    const anoSeguinte = ano + 1;
    const ultimoDiaDoMes = new Date(anoSeguinte, mes, 0).getDate();
    proxima = new Date(anoSeguinte, mes - 1, Math.min(dia, ultimoDiaDoMes));
  }
  return `${proxima.getFullYear()}-${String(proxima.getMonth() + 1).padStart(2, "0")}-${String(proxima.getDate()).padStart(2, "0")}`;
}

// Despesas fixas pagas cuja nova provisão já chegou voltam a "não pago"
export async function renovarPendentes() {
  const db = await getDb();
  await db.runAsync(
    `UPDATE despesas SET pago = 0, valor_pago = 0
     WHERE pago = 1
       AND fixa = 1
       AND ((frequencia = 'mensal' AND provisao < date('now', 'localtime', 'start of month', '+1 month'))
         OR (frequencia != 'mensal' AND provisao <= date('now', 'localtime')))`
  );
}

export async function totalDespesas(): Promise<number> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ total: number | null }>(
    "SELECT SUM(valor) AS total FROM despesas"
  );
  return r?.total ?? 0;
}

// Soma de todos os pagamentos lançados: inclui quitações parciais.
export async function totalDespesasPagas(): Promise<number> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ total: number | null }>(
    "SELECT SUM(valor) AS total FROM pagamentos"
  );
  return r?.total ?? 0;
}

export async function excluirDespesa(id: number) {
  const db = await getDb();
  const atual = await db.getFirstAsync<{ grupo_parcelas_id: number | null }>("SELECT grupo_parcelas_id FROM despesas WHERE id = ?", [id]);
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM despesas WHERE id = ?", [id]);
    if (atual?.grupo_parcelas_id) await ajustarGrupoParcelas(db, "despesas", atual.grupo_parcelas_id);
  });
}

async function ajustarGrupoParcelas(db: Awaited<ReturnType<typeof getDb>>, tabela: "despesas" | "receitas", grupoId: number) {
  const itens = await db.getAllAsync<{ id: number; valor: number }>(
    `SELECT id, valor FROM ${tabela} WHERE grupo_parcelas_id = ? ORDER BY numero_parcela, id`, [grupoId]
  );
  if (itens.length === 0) {
    await db.runAsync("DELETE FROM grupos_parcelas WHERE id = ?", [grupoId]);
    return;
  }
  const total = itens.reduce((soma, item) => soma + item.valor, 0);
  await db.runAsync("UPDATE grupos_parcelas SET quantidade = ?, valor_total = ? WHERE id = ?", [itens.length, total, grupoId]);
  for (let indice = 0; indice < itens.length; indice++) {
    await db.runAsync(`UPDATE ${tabela} SET numero_parcela = ?, parcelas = ? WHERE id = ?`, [indice + 1, itens.length, itens[indice].id]);
  }
}

function dataHojeISO() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}
