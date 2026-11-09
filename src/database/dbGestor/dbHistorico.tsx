import { getDb } from "../db";
import { lerTags } from "./dbTags";

export type ResumoMes = {
  mes: string; // AAAA-MM
  entradas: number;
  gastos: number;
  sobra: number;
};

export type GastoTipo = { tipo: string; total: number };
type GastoComTags = { valor: number; tags_ids: string };
type ReceitaComTags = { valor: number; tags_ids: string };

function totalDaTag(linhas: ReceitaComTags[], idTag: number | undefined): number {
  if (idTag === undefined) return 0;
  return linhas.reduce((total, linha) => lerTags(linha.tags_ids).includes(idTag) ? total + linha.valor : total, 0);
}

function agruparGastosPorTags(linhas: GastoComTags[], nomesPorId: Map<number, string>): GastoTipo[] {
  const totais = new Map<string, number>();
  for (const linha of linhas) {
    const nomes = lerTags(linha.tags_ids).map((id) => nomesPorId.get(id)).filter((nome): nome is string => Boolean(nome));
    const categorias = nomes.length ? nomes : ["Sem tags"];
    const parcela = linha.valor / categorias.length;
    for (const nome of categorias) totais.set(nome, (totais.get(nome) ?? 0) + parcela);
  }
  return [...totais].map(([tipo, total]) => ({ tipo, total })).sort((a, b) => b.total - a.total);
}
export type MovimentoParcelado = { id: number; natureza: "Despesa" | "Receita"; nome: string; parcela: number; quantidade: number; valor: number; data: string; status: string };

export async function movimentosParceladosDoMes(mes: string): Promise<MovimentoParcelado[]> {
  const db = await getDb();
  return db.getAllAsync<MovimentoParcelado>(`
    SELECT p.id, 'Despesa' AS natureza, p.nome, d.numero_parcela AS parcela, d.parcelas AS quantidade,
      p.valor, p.data_pagamento AS data, 'Pago' AS status
    FROM pagamentos p JOIN despesas d ON d.id = p.despesa_id
    WHERE d.grupo_parcelas_id IS NOT NULL AND substr(p.data_pagamento, 1, 7) = ?
    UNION ALL
    SELECT r.id, 'Receita' AS natureza, r.nome, r.numero_parcela AS parcela, r.parcelas AS quantidade,
      r.valor, COALESCE(r.data_recebimento, r.data) AS data, 'Recebido' AS status
    FROM receitas r WHERE r.grupo_parcelas_id IS NOT NULL AND r.recebido = 1
      AND substr(COALESCE(r.data_recebimento, r.data), 1, 7) = ?
    ORDER BY data DESC, id DESC
  `, [mes, mes]);
}
export type UnificacaoHistorico = { id: number; natureza: string; nome_unificado: string; valor_unificado: number; nome_origem: string; valor_origem: number; nome_destino: string; valor_destino: number; data_unificacao: string };

export async function listarUnificacoes(): Promise<UnificacaoHistorico[]> {
  const db = await getDb();
  return db.getAllAsync<UnificacaoHistorico>("SELECT * FROM unificacoes ORDER BY id DESC");
}

export type CategoriaPlanejada = {
  tipo: string;
  pago: number;
  pendente: number;
  total: number;
};

export type PlanejamentoMes = {
  receitasRecebidas: number;
  receitasAReceber: number;
  salarioRecebido: number;
  salarioAReceber: number;
  despesasPagas: number;
  despesasAPagar: number;
  categorias: CategoriaPlanejada[];
};

// Projeção do mês: receitas já recebidas e previstas, menos pagamentos
// registrados no mês e despesas ainda pendentes com provisão nesse mês.
export async function planejamentoDoMes(mes: string): Promise<PlanejamentoMes> {
  const db = await getDb();

  const [recebidas, aReceber, salariosRecebidos, salariosAReceber, pagas, pendentes, pagasPorTags, pendentesPorTags, tags] =
    await Promise.all([
      db.getFirstAsync<{ total: number | null }>(
        "SELECT SUM(valor) AS total FROM receitas WHERE recebido = 1 AND substr(data, 1, 7) = ?",
        [mes]
      ),
      db.getFirstAsync<{ total: number | null }>(
        "SELECT SUM(valor) AS total FROM receitas WHERE recebido = 0 AND substr(vencimento, 1, 7) = ?",
        [mes]
      ),
      db.getAllAsync<ReceitaComTags>(
        "SELECT valor, tags_ids FROM receitas WHERE recebido = 1 AND substr(data, 1, 7) = ?",
        [mes]
      ),
      db.getAllAsync<ReceitaComTags>(
        "SELECT valor, tags_ids FROM receitas WHERE recebido = 0 AND substr(vencimento, 1, 7) = ?",
        [mes]
      ),
      db.getFirstAsync<{ total: number | null }>(
        "SELECT SUM(valor) AS total FROM pagamentos WHERE substr(data_pagamento, 1, 7) = ?",
        [mes]
      ),
      db.getFirstAsync<{ total: number | null }>(
        "SELECT SUM(MAX(0, valor - valor_pago)) AS total FROM despesas WHERE pago = 0 AND substr(provisao, 1, 7) = ?",
        [mes]
      ),
      db.getAllAsync<GastoComTags>(
        `SELECT valor, tags_ids FROM pagamentos WHERE substr(data_pagamento, 1, 7) = ?`,
        [mes]
      ),
      db.getAllAsync<GastoComTags>(
        `SELECT MAX(0, valor - valor_pago) AS valor, tags_ids FROM despesas
         WHERE pago = 0 AND substr(provisao, 1, 7) = ?`,
        [mes]
      ),
      db.getAllAsync<{ id: number; nome: string }>("SELECT id, nome FROM tags"),
    ]);

  const nomesPorId = new Map(tags.map((tag) => [tag.id, tag.nome]));
  const tagSalarioId = tags.find((tag) => tag.nome.localeCompare("Salário", "pt-BR", { sensitivity: "base" }) === 0)?.id;
  const categorias = new Map<string, CategoriaPlanejada>();
  for (const item of agruparGastosPorTags(pagasPorTags, nomesPorId)) {
    categorias.set(item.tipo, {
      tipo: item.tipo,
      pago: item.total,
      pendente: 0,
      total: item.total,
    });
  }
  for (const item of agruparGastosPorTags(pendentesPorTags, nomesPorId)) {
    const categoria = categorias.get(item.tipo) ?? {
      tipo: item.tipo,
      pago: 0,
      pendente: 0,
      total: 0,
    };
    categoria.pendente = item.total;
    categoria.total += item.total;
    categorias.set(item.tipo, categoria);
  }

  return {
    receitasRecebidas: recebidas?.total ?? 0,
    receitasAReceber: aReceber?.total ?? 0,
    salarioRecebido: totalDaTag(salariosRecebidos, tagSalarioId),
    salarioAReceber: totalDaTag(salariosAReceber, tagSalarioId),
    despesasPagas: pagas?.total ?? 0,
    despesasAPagar: pendentes?.total ?? 0,
    categorias: [...categorias.values()].sort((a, b) => b.total - a.total),
  };
}

// Lista de meses "AAAA-MM", do mais antigo ao atual
export function ultimosMeses(qtd: number): string[] {
  const hoje = new Date();
  const lista: string[] = [];

  for (let i = qtd - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    lista.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }
  return lista;
}

// Receitas recebidas e pagamentos de cada mês
export async function resumoPorMes(qtd = 12): Promise<ResumoMes[]> {
  const db = await getDb();
  const meses = ultimosMeses(qtd);
  const inicio = meses[0];

  const entradas = await db.getAllAsync<{ mes: string; total: number }>(
    `SELECT substr(data, 1, 7) AS mes, SUM(valor) AS total
     FROM receitas
     WHERE recebido = 1 AND substr(data, 1, 7) >= ?
     GROUP BY mes`,
    [inicio]
  );

  const gastos = await db.getAllAsync<{ mes: string; total: number }>(
    `SELECT substr(data_pagamento, 1, 7) AS mes, SUM(valor) AS total
     FROM pagamentos
     WHERE substr(data_pagamento, 1, 7) >= ?
     GROUP BY mes`,
    [inicio]
  );

  return meses.map((mes) => {
    const e = entradas.find((x) => x.mes === mes)?.total ?? 0;
    const g = gastos.find((x) => x.mes === mes)?.total ?? 0;
    return { mes, entradas: e, gastos: g, sobra: e - g };
  });
}

// Quanto foi gasto por tag em um mês ("AAAA-MM")
export async function gastosPorTipo(mes: string): Promise<GastoTipo[]> {
  const db = await getDb();
  const [pagamentos, tags] = await Promise.all([
    db.getAllAsync<GastoComTags>("SELECT valor, tags_ids FROM pagamentos WHERE substr(data_pagamento, 1, 7) = ?", [mes]),
    db.getAllAsync<{ id: number; nome: string }>("SELECT id, nome FROM tags"),
  ]);
  return agruparGastosPorTags(pagamentos, new Map(tags.map((tag) => [tag.id, tag.nome])));
}
