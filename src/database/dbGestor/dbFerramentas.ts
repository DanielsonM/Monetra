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

export async function buscarLancamentos(): Promise<Lancamento[]> {
  const db = await getDb();
  return db.getAllAsync<Lancamento>(`
    SELECT id, nome, valor, tipo AS categoria, vencimento AS data, 'Despesa' AS natureza,
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
  const tabelas = ["despesas", "pagamentos", "receitas", "unificacoes", "orcamentos", "metas", "configuracoes"];
  const dados: Record<string, unknown[]> = {};
  for (const tabela of tabelas) dados[tabela] = await db.getAllAsync(`SELECT * FROM ${tabela}`);
  return JSON.stringify({ app: "Monetra", formato: 1, criadoEm: new Date().toISOString(), dados });
}

export async function restaurarBackup(texto: string) {
  const backup = JSON.parse(texto) as { app?: string; formato?: number; dados?: Record<string, unknown[]> };
  if (backup.app !== "Monetra" || backup.formato !== 1 || !backup.dados) throw new Error("Arquivo de backup inválido.");
  const tabelas = ["despesas", "pagamentos", "receitas", "unificacoes", "orcamentos", "metas", "configuracoes"] as const;
  const tabelasObrigatorias = ["despesas", "pagamentos", "receitas", "orcamentos", "metas", "configuracoes"] as const;
  if (tabelasObrigatorias.some((tabela) => !Array.isArray(backup.dados?.[tabela]))) throw new Error("Arquivo de backup incompleto.");
  const db = await getDb();
  const colunas: Record<(typeof tabelas)[number], string[]> = {
    despesas: ["id", "nome", "valor", "tipo", "vencimento", "pago", "observacao", "fixa", "frequencia", "criado_em"],
    pagamentos: ["id", "despesa_id", "nome", "tipo", "valor", "vencimento", "data_pagamento"],
    receitas: ["id", "nome", "valor", "tipo", "data", "vencimento", "observacao", "recebido", "criado_em"],
    unificacoes: ["id", "natureza", "nome_unificado", "valor_unificado", "nome_origem", "valor_origem", "nome_destino", "valor_destino", "data_unificacao"],
    orcamentos: ["tipo", "limite"],
    metas: ["id", "nome", "objetivo", "guardado", "prazo", "criado_em"],
    configuracoes: ["chave", "valor"],
  };
  await db.withTransactionAsync(async () => {
    for (const tabela of tabelas) {
      await db.runAsync(`DELETE FROM ${tabela}`);
      for (const linha of backup.dados?.[tabela] ?? []) {
        if (!linha || typeof linha !== "object") continue;
        const registro = linha as Record<string, string | number | null>;
        const presentes = colunas[tabela].filter((coluna) => coluna in registro);
        if (!presentes.length) continue;
        const sql = `INSERT INTO ${tabela} (${presentes.join(",")}) VALUES (${presentes.map(() => "?").join(",")})`;
        await db.runAsync(sql, presentes.map((coluna) => registro[coluna] ?? null));
      }
    }
  });
}
