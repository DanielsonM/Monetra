import { somarUmMes } from "../../utils/converterData";
import { getDb } from "../db";

export type Despesa = {
  id: number;
  nome: string;
  valor: number;
  tipo: string;
  vencimento: string; // AAAA-MM-DD
  pago: number; // 0 = não pago, 1 = pago
  observacao: string | null;
  fixa: number; // 0 = única, 1 = fixa (repete todo mês até ser removida)
  frequencia: "semanal" | "mensal" | "anual";
  parcelas: number;
  criado_em: string;
};

export async function inserirDespesa(
  d: Omit<Despesa, "id" | "criado_em" | "pago" | "observacao" | "fixa" | "frequencia" | "parcelas"> & {
    observacao?: string;
    fixa?: boolean;
    frequencia?: "semanal" | "mensal" | "anual";
    parcelas?: number;
  }
) {
  const db = await getDb();
  const r = await db.runAsync(
    "INSERT INTO despesas (nome, valor, tipo, vencimento, observacao, fixa, frequencia, parcelas) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      d.nome,
      d.valor,
      d.tipo,
      d.vencimento,
      d.observacao?.trim() || null,
      d.fixa ? 1 : 0,
      d.frequencia ?? "mensal",
      d.parcelas ?? 1,
    ]
  );
  return r.lastInsertRowId;
}

export async function listarDespesas(): Promise<Despesa[]> {
  const db = await getDb();
  return db.getAllAsync<Despesa>(
    "SELECT * FROM despesas ORDER BY vencimento ASC"
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
    tipo: string;
    vencimento: string;
    observacao?: string;
    fixa?: boolean;
    frequencia?: "semanal" | "mensal" | "anual";
    parcelas?: number;
  }
) {
  const db = await getDb();
  await db.runAsync(
    "UPDATE despesas SET nome = ?, valor = ?, tipo = ?, vencimento = ?, observacao = ?, fixa = ?, frequencia = ?, parcelas = ? WHERE id = ?",
    [
      d.nome,
      d.valor,
      d.tipo,
      d.vencimento,
      d.observacao?.trim() || null,
      d.fixa ? 1 : 0,
      d.frequencia ?? "mensal",
      d.parcelas ?? 1,
      id,
    ]
  );
}

// Despesas não pagas (de qualquer data) + as do mês atual em diante
export async function listarRecentes(limite = 5): Promise<Despesa[]> {
  const db = await getDb();
  return db.getAllAsync<Despesa>(
    `SELECT * FROM despesas
     WHERE pago = 0 OR vencimento >= date('now', 'localtime', 'start of month')
     ORDER BY vencimento ASC
     LIMIT ?`,
    [limite]
  );
}

// Registra o pagamento no histórico e marca como paga.
// Se for despesa fixa, empurra o vencimento para o mês seguinte
// (tudo junto: ou grava tudo, ou nada)
export async function pagarDespesa(id: number) {
  const db = await getDb();
  const d = await db.getFirstAsync<Despesa>(
    "SELECT * FROM despesas WHERE id = ?",
    [id]
  );
  if (!d) return;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      "INSERT INTO pagamentos (despesa_id, nome, tipo, valor, vencimento) VALUES (?, ?, ?, ?, ?)",
      [d.id, d.nome, d.tipo, d.valor, d.vencimento]
    );

    if (d.fixa) {
      const proximoVencimento = somarFrequencia(d.vencimento, d.frequencia);
      await db.runAsync(
        "UPDATE despesas SET pago = 1, vencimento = ? WHERE id = ?",
        [proximoVencimento, id]
      );
    } else {
      await db.runAsync("UPDATE despesas SET pago = 1 WHERE id = ?", [id]);
    }
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

// Despesas fixas pagas cujo novo vencimento já caiu no mês atual voltam a "não pago"
export async function renovarPendentes() {
  const db = await getDb();
  await db.runAsync(
    `UPDATE despesas SET pago = 0
     WHERE pago = 1
       AND fixa = 1
       AND ((frequencia = 'mensal' AND vencimento < date('now', 'localtime', 'start of month', '+1 month'))
         OR (frequencia != 'mensal' AND vencimento <= date('now', 'localtime')))`
  );
}

export async function totalDespesas(): Promise<number> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ total: number | null }>(
    "SELECT SUM(valor) AS total FROM despesas"
  );
  return r?.total ?? 0;
}

// Soma só das despesas já pagas: é o valor que sai do saldo disponível
export async function totalDespesasPagas(): Promise<number> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ total: number | null }>(
    "SELECT SUM(valor) AS total FROM despesas WHERE pago = 1"
  );
  return r?.total ?? 0;
}

export async function excluirDespesa(id: number) {
  const db = await getDb();
  await db.runAsync("DELETE FROM despesas WHERE id = ?", [id]);
}
