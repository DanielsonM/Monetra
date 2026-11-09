import { getDb } from "../db";

export type LancamentoRecente = {
  id: number;
  nome: string;
  valor: number;
  tags_ids: string;
  data: string;
  dataPrevista: string;
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
    `SELECT id, nome, valor, tags_ids, data, dataPrevista, liquidado, criado_em, natureza
     FROM (
       SELECT id, nome, MAX(0, valor - valor_pago) AS valor, tags_ids, provisao AS data, provisao AS dataPrevista, pago AS liquidado,
              criado_em, 'despesa' AS natureza
       FROM despesas
       UNION ALL
       SELECT id, nome, valor, tags_ids, data, vencimento AS dataPrevista, recebido AS liquidado,
              criado_em, 'receita' AS natureza
       FROM receitas
     )
     ${natureza ? "WHERE natureza = ?" : ""}
     ORDER BY criado_em DESC, id DESC
     LIMIT ?`,
    natureza ? [natureza, limite] : [limite]
  );
}
