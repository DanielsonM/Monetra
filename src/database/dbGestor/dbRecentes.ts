import { getDb } from "../db";

export type LancamentoRecente = {
  id: number;
  nome: string;
  valor: number;
  tipo: string;
  data: string;
  vencimento: string;
  liquidado: number;
  criado_em: string;
  natureza: "despesa" | "receita";
};

export type NaturezaRecente = "receita" | "despesa";

export async function listarLancamentosRecentes(
  limite = 5,
  natureza?: NaturezaRecente
): Promise<LancamentoRecente[]> {
  const db = await getDb();
  return db.getAllAsync<LancamentoRecente>(
    `SELECT id, nome, valor, tipo, data, vencimento, liquidado, criado_em, natureza
     FROM (
       SELECT id, nome, valor, tipo, vencimento AS data, vencimento, pago AS liquidado,
              criado_em, 'despesa' AS natureza
       FROM despesas
       UNION ALL
       SELECT id, nome, valor, tipo, data, vencimento, recebido AS liquidado,
              criado_em, 'receita' AS natureza
       FROM receitas
     )
     ${natureza ? "WHERE natureza = ?" : ""}
     ORDER BY criado_em DESC, id DESC
     LIMIT ?`,
    natureza ? [natureza, limite] : [limite]
  );
}
