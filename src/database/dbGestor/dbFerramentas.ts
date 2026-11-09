import { getDb } from "../db";

export type Lancamento = {
  id: number;
  nome: string;
  valor: number;
  categoria: string;
  data: string;
  natureza: "Despesa" | "Receita";
  status: "Pago" | "Pendente" | "Recebido" | "A receber";
};

export type Meta = { id: number; nome: string; objetivo: number; guardado: number; prazo: string | null };

export type GrupoParcelamentoRelatorio = {
  id: number;
  natureza: "Despesa" | "Receita";
  nome: string;
  tipo: string;
  valor_total: number;
  quantidade: number;
  modo_valor: "total" | "parcela";
  criacao: string;
  concluidas: number;
  recebidas: number;
  pago: number;
  pendente: number;
};

export async function buscarRelatorioParcelamentos(): Promise<GrupoParcelamentoRelatorio[]> {
  const db = await getDb();
  return db.getAllAsync<GrupoParcelamentoRelatorio>(`
    SELECT g.id, g.natureza, g.nome, g.tipo, g.valor_total, g.quantidade, g.modo_valor,
      g.criado_em AS criacao,
      CASE WHEN g.natureza = 'Despesa' THEN (SELECT COUNT(*) FROM despesas d WHERE d.grupo_parcelas_id = g.id AND d.pago = 1)
        ELSE (SELECT COUNT(*) FROM receitas r WHERE r.grupo_parcelas_id = g.id AND r.recebido = 1) END AS concluidas,
      CASE WHEN g.natureza = 'Receita' THEN (SELECT COUNT(*) FROM receitas r WHERE r.grupo_parcelas_id = g.id AND r.recebido = 1) ELSE 0 END AS recebidas,
      CASE WHEN g.natureza = 'Despesa' THEN COALESCE((SELECT SUM(p.valor) FROM pagamentos p JOIN despesas d ON d.id = p.despesa_id WHERE d.grupo_parcelas_id = g.id), 0)
        ELSE COALESCE((SELECT SUM(r.valor) FROM receitas r WHERE r.grupo_parcelas_id = g.id AND r.recebido = 1), 0) END AS pago,
      CASE WHEN g.natureza = 'Despesa' THEN COALESCE((SELECT SUM(MAX(0, d.valor - d.valor_pago)) FROM despesas d WHERE d.grupo_parcelas_id = g.id), 0)
        ELSE COALESCE((SELECT SUM(r.valor) FROM receitas r WHERE r.grupo_parcelas_id = g.id AND r.recebido = 0), 0) END AS pendente
    FROM grupos_parcelas g ORDER BY g.criado_em DESC, g.id DESC
  `);
}

export async function buscarLancamentos(): Promise<Lancamento[]> {
  const db = await getDb();
  return db.getAllAsync<Lancamento>(`
    SELECT id, nome, MAX(0, valor - valor_pago) AS valor, tipo AS categoria, provisao AS data, 'Despesa' AS natureza,
      CASE WHEN pago = 1 THEN 'Pago' ELSE 'Pendente' END AS status
    FROM despesas WHERE pago = 0
    UNION ALL
    SELECT id, nome, valor, tipo, data_pagamento, 'Despesa', 'Pago' FROM pagamentos
    UNION ALL
    SELECT id, nome, valor, tipo, vencimento, 'Receita',
      CASE WHEN recebido = 1 THEN 'Recebido' ELSE 'A receber' END FROM receitas
    ORDER BY data DESC, id DESC
  `);
}

export async function listarMetas(): Promise<Meta[]> {
  const db = await getDb();
  return db.getAllAsync<Meta>("SELECT * FROM metas ORDER BY id DESC");
}

export async function criarMeta(nome: string, objetivo: number, prazo?: string) {
  const db = await getDb();
  await db.runAsync("INSERT INTO metas (nome, objetivo, prazo) VALUES (?, ?, ?)", [nome, objetivo, prazo || null]);
}

export async function aportarMeta(id: number, valor: number) {
  const db = await getDb();
  await db.runAsync("UPDATE metas SET guardado = guardado + ? WHERE id = ?", [valor, id]);
}

export async function excluirMeta(id: number) {
  const db = await getDb();
  await db.runAsync("DELETE FROM metas WHERE id = ?", [id]);
}

export async function criarBackup(): Promise<string> {
  const db = await getDb();
  const tabelas = ["despesas", "pagamentos", "grupos_parcelas", "bancos", "receitas", "aplicacoes", "saques_aplicacoes", "unificacoes", "orcamentos", "metas", "configuracoes", "tags"];
  const dados: Record<string, unknown[]> = {};
  for (const tabela of tabelas) dados[tabela] = await db.getAllAsync(`SELECT * FROM ${tabela}`);
  return JSON.stringify({ app: "Monetra", formato: 1, criadoEm: new Date().toISOString(), dados });
}

export async function restaurarBackup(texto: string) {
  const backup = JSON.parse(texto) as { app?: string; formato?: number; dados?: Record<string, unknown[]> };
  if (backup.app !== "Monetra" || backup.formato !== 1 || !backup.dados) throw new Error("Arquivo de backup inválido.");
  const tabelas = ["despesas", "pagamentos", "grupos_parcelas", "bancos", "receitas", "aplicacoes", "saques_aplicacoes", "unificacoes", "orcamentos", "metas", "configuracoes", "tags"] as const;
  const tabelasObrigatorias = ["despesas", "pagamentos", "receitas", "orcamentos", "metas", "configuracoes"] as const;
  if (tabelasObrigatorias.some((tabela) => !Array.isArray(backup.dados?.[tabela]))) throw new Error("Arquivo de backup incompleto.");
  const db = await getDb();
  const colunas: Record<(typeof tabelas)[number], string[]> = {
    despesas: ["id", "nome", "valor", "tipo", "provisao", "data_emissao", "pago", "observacao", "fixa", "frequencia", "parcelas", "numero_parcela", "grupo_parcelas_id", "valor_pago", "tags_ids", "criado_em"],
    pagamentos: ["id", "despesa_id", "nome", "tipo", "valor", "provisao", "data_pagamento"],
    grupos_parcelas: ["id", "natureza", "nome", "tipo", "valor_total", "quantidade", "modo_valor", "data_emissao", "criado_em"],
    receitas: ["id", "nome", "valor", "tipo", "data", "vencimento", "observacao", "recebido", "data_recebimento", "fixa", "parcelas", "banco_id", "grupo_parcelas_id", "numero_parcela", "tags_ids", "criado_em"],
    bancos: ["id", "nome", "cor", "criado_em"],
    aplicacoes: ["id", "banco", "valor", "banco_id", "criado_em"],
    saques_aplicacoes: ["id", "aplicacao_id", "banco_id", "banco_nome", "banco_cor", "valor", "data", "receita_id", "criado_em"],
    unificacoes: ["id", "natureza", "nome_unificado", "valor_unificado", "nome_origem", "valor_origem", "nome_destino", "valor_destino", "data_unificacao"],
    orcamentos: ["tipo", "limite"],
    metas: ["id", "nome", "objetivo", "guardado", "prazo", "criado_em"],
    configuracoes: ["chave", "valor"],
    tags: ["id", "nome", "criado_em"],
  };
  await db.withTransactionAsync(async () => {
    for (const tabela of tabelas) {
      await db.runAsync(`DELETE FROM ${tabela}`);
      for (const linha of backup.dados?.[tabela] ?? []) {
        if (!linha || typeof linha !== "object") continue;
        const registro = { ...(linha as Record<string, string | number | null>) };
        if (tabela === "despesas" || tabela === "pagamentos") {
          registro.provisao ??= registro.vencimento ?? null;
          delete registro.vencimento;
        }
        const presentes = colunas[tabela].filter((coluna) => coluna in registro);
        if (!presentes.length) continue;
        const sql = `INSERT INTO ${tabela} (${presentes.join(",")}) VALUES (${presentes.map(() => "?").join(",")})`;
        await db.runAsync(sql, presentes.map((coluna) => registro[coluna] ?? null));
      }
    }
  });

  // Backups antigos guardavam o nome do banco diretamente na aplicação.
  // Recria registros básicos para que essas aplicações continuem selecionáveis.
  if (!Array.isArray(backup.dados.bancos)) {
    await db.execAsync(`
      INSERT OR IGNORE INTO bancos (nome, cor)
      SELECT DISTINCT TRIM(banco), '#1565C0' FROM aplicacoes WHERE TRIM(banco) <> '';
      UPDATE aplicacoes
      SET banco_id = (SELECT id FROM bancos WHERE bancos.nome = aplicacoes.banco COLLATE NOCASE)
      WHERE banco_id IS NULL;
    `);
  }
}
