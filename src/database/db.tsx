import * as SQLite from "expo-sqlite";

const NOME_BANCO = "monetra.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// Cria as tabelas (se ainda não existirem) já com todas as colunas.
// Colunas novas entram por migração no final desta função, então não
// é preciso limpar os dados do app.
// Obs.: a tabela "saldos" não é mais criada. Em quem já tinha o app ela
// continua existindo no banco, sem uso, e os dados dela ficam guardados.
async function criarTabelas(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS despesas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      valor REAL NOT NULL,
      tipo TEXT NOT NULL,
      provisao TEXT NOT NULL,
      data_emissao TEXT NOT NULL DEFAULT (date('now', 'localtime')),
      pago INTEGER NOT NULL DEFAULT 0,
      observacao TEXT,
      fixa INTEGER NOT NULL DEFAULT 0,
      frequencia TEXT NOT NULL DEFAULT 'mensal',
      parcelas INTEGER NOT NULL DEFAULT 1,
      numero_parcela INTEGER NOT NULL DEFAULT 1,
      grupo_parcelas_id INTEGER,
      valor_pago REAL NOT NULL DEFAULT 0,
      criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS configuracoes (
      chave TEXT PRIMARY KEY NOT NULL,
      valor TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orcamentos (
      tipo TEXT PRIMARY KEY NOT NULL,
      limite REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS metas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      objetivo REAL NOT NULL,
      guardado REAL NOT NULL DEFAULT 0,
      prazo TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS pagamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      despesa_id INTEGER,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL,
      valor REAL NOT NULL,
      provisao TEXT NOT NULL,
      data_pagamento TEXT NOT NULL DEFAULT (date('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS grupos_parcelas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      natureza TEXT NOT NULL,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL,
      valor_total REAL NOT NULL,
      quantidade INTEGER NOT NULL,
      modo_valor TEXT NOT NULL,
      data_emissao TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS bancos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      cor TEXT NOT NULL,
      criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_bancos_nome ON bancos(nome COLLATE NOCASE);

    CREATE TABLE IF NOT EXISTS receitas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      valor REAL NOT NULL,
      tipo TEXT NOT NULL,
      data TEXT NOT NULL,
      vencimento TEXT NOT NULL,
      observacao TEXT,
      recebido INTEGER NOT NULL DEFAULT 0,
      data_recebimento TEXT,
      fixa INTEGER NOT NULL DEFAULT 0,
      parcelas INTEGER NOT NULL DEFAULT 1,
      banco_id INTEGER,
      grupo_parcelas_id INTEGER,
      numero_parcela INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS aplicacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      banco TEXT NOT NULL,
      valor REAL NOT NULL,
      banco_id INTEGER,
      criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS saques_aplicacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aplicacao_id INTEGER,
      banco_id INTEGER,
      banco_nome TEXT NOT NULL,
      banco_cor TEXT NOT NULL,
      valor REAL NOT NULL,
      data TEXT NOT NULL,
      receita_id INTEGER,
      criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS unificacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      natureza TEXT NOT NULL,
      nome_unificado TEXT NOT NULL,
      valor_unificado REAL NOT NULL,
      nome_origem TEXT NOT NULL,
      valor_origem REAL NOT NULL,
      nome_destino TEXT NOT NULL,
      valor_destino REAL NOT NULL,
      data_unificacao TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Migração: adiciona a coluna "fixa" em bancos criados antes dela existir
  const colunas = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(despesas)"
  );
  if (!colunas.some((c) => c.name === "fixa")) {
    await db.execAsync(
      "ALTER TABLE despesas ADD COLUMN fixa INTEGER NOT NULL DEFAULT 0;"
    );
    // Despesas antigas já se repetiam todo mês: mantém esse comportamento
    await db.execAsync("UPDATE despesas SET fixa = 1;");
  }
  if (!colunas.some((c) => c.name === "frequencia")) {
    await db.execAsync("ALTER TABLE despesas ADD COLUMN frequencia TEXT NOT NULL DEFAULT 'mensal';");
  }
  if (!colunas.some((c) => c.name === "parcelas")) {
    await db.execAsync("ALTER TABLE despesas ADD COLUMN parcelas INTEGER NOT NULL DEFAULT 1;");
  }
  if (!colunas.some((c) => c.name === "valor_pago")) {
    await db.execAsync("ALTER TABLE despesas ADD COLUMN valor_pago REAL NOT NULL DEFAULT 0;");
  }
  if (!colunas.some((c) => c.name === "provisao")) {
    await db.execAsync("ALTER TABLE despesas ADD COLUMN provisao TEXT NOT NULL DEFAULT ''; UPDATE despesas SET provisao = vencimento WHERE provisao = '';");
  }
  if (!colunas.some((c) => c.name === "data_emissao")) {
    await db.execAsync("ALTER TABLE despesas ADD COLUMN data_emissao TEXT NOT NULL DEFAULT ''; UPDATE despesas SET data_emissao = substr(criado_em, 1, 10) WHERE data_emissao = '';");
  }
  if (!colunas.some((c) => c.name === "numero_parcela")) {
    await db.execAsync("ALTER TABLE despesas ADD COLUMN numero_parcela INTEGER NOT NULL DEFAULT 1;");
  }
  if (!colunas.some((c) => c.name === "grupo_parcelas_id")) {
    await db.execAsync("ALTER TABLE despesas ADD COLUMN grupo_parcelas_id INTEGER;");
  }
  if (colunas.some((c) => c.name === "vencimento")) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE despesas_nova (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          valor REAL NOT NULL,
          tipo TEXT NOT NULL,
          provisao TEXT NOT NULL,
          data_emissao TEXT NOT NULL DEFAULT (date('now', 'localtime')),
          pago INTEGER NOT NULL DEFAULT 0,
          observacao TEXT,
          fixa INTEGER NOT NULL DEFAULT 0,
          frequencia TEXT NOT NULL DEFAULT 'mensal',
          parcelas INTEGER NOT NULL DEFAULT 1,
          numero_parcela INTEGER NOT NULL DEFAULT 1,
          grupo_parcelas_id INTEGER,
          valor_pago REAL NOT NULL DEFAULT 0,
          criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        );
        INSERT INTO despesas_nova (id, nome, valor, tipo, provisao, data_emissao, pago, observacao, fixa, frequencia, parcelas, numero_parcela, grupo_parcelas_id, valor_pago, criado_em)
        SELECT id, nome, valor, tipo, provisao, data_emissao, pago, observacao, fixa, frequencia, parcelas, numero_parcela, grupo_parcelas_id, valor_pago, criado_em FROM despesas;
        DROP TABLE despesas;
        ALTER TABLE despesas_nova RENAME TO despesas;
      `);
    });
  }

  const colunasPagamentos = await db.getAllAsync<{ name: string }>("PRAGMA table_info(pagamentos)");
  if (!colunasPagamentos.some((c) => c.name === "provisao")) {
    await db.execAsync("ALTER TABLE pagamentos ADD COLUMN provisao TEXT NOT NULL DEFAULT ''; UPDATE pagamentos SET provisao = vencimento WHERE provisao = '';");
  }
  if (colunasPagamentos.some((c) => c.name === "vencimento")) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE pagamentos_nova (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          despesa_id INTEGER,
          nome TEXT NOT NULL,
          tipo TEXT NOT NULL,
          valor REAL NOT NULL,
          provisao TEXT NOT NULL,
          data_pagamento TEXT NOT NULL DEFAULT (date('now', 'localtime'))
        );
        INSERT INTO pagamentos_nova (id, despesa_id, nome, tipo, valor, provisao, data_pagamento)
        SELECT id, despesa_id, nome, tipo, valor, provisao, data_pagamento FROM pagamentos;
        DROP TABLE pagamentos;
        ALTER TABLE pagamentos_nova RENAME TO pagamentos;
      `);
    });
  }

  // Migrações da tabela de receitas
  const colunasReceitas = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(receitas)"
  );
  const temData = colunasReceitas.some((c) => c.name === "data");
  const temVencimento = colunasReceitas.some((c) => c.name === "vencimento");

  // Bancos antigos só tinham "data": cria o "vencimento" copiando a data
  if (!temVencimento) {
    await db.execAsync(
      "ALTER TABLE receitas ADD COLUMN vencimento TEXT NOT NULL DEFAULT '';"
    );
    await db.execAsync("UPDATE receitas SET vencimento = data;");
  }

  // Bancos em que "data" foi renomeada para "vencimento": recria a "data"
  // (data de entrada) copiando o vencimento
  if (!temData) {
    await db.execAsync(
      "ALTER TABLE receitas ADD COLUMN data TEXT NOT NULL DEFAULT '';"
    );
    await db.execAsync("UPDATE receitas SET data = vencimento;");
  }

  // Adiciona a coluna "recebido" (receitas já cadastradas ficam como "não recebidas")
  if (!colunasReceitas.some((c) => c.name === "recebido")) {
    await db.execAsync(
      "ALTER TABLE receitas ADD COLUMN recebido INTEGER NOT NULL DEFAULT 0;"
    );
  }
  if (!colunasReceitas.some((c) => c.name === "data_recebimento")) {
    await db.execAsync("ALTER TABLE receitas ADD COLUMN data_recebimento TEXT;");
    await db.execAsync("UPDATE receitas SET data_recebimento = data WHERE recebido = 1;");
  }
  if (!colunasReceitas.some((c) => c.name === "fixa")) {
    await db.execAsync("ALTER TABLE receitas ADD COLUMN fixa INTEGER NOT NULL DEFAULT 0;");
  }
  if (!colunasReceitas.some((c) => c.name === "parcelas")) {
    await db.execAsync("ALTER TABLE receitas ADD COLUMN parcelas INTEGER NOT NULL DEFAULT 1;");
  }

  if (!colunasReceitas.some((c) => c.name === "banco_id")) {
    await db.execAsync("ALTER TABLE receitas ADD COLUMN banco_id INTEGER;");
  }
  if (!colunasReceitas.some((c) => c.name === "grupo_parcelas_id")) {
    await db.execAsync("ALTER TABLE receitas ADD COLUMN grupo_parcelas_id INTEGER;");
  }
  if (!colunasReceitas.some((c) => c.name === "numero_parcela")) {
    await db.execAsync("ALTER TABLE receitas ADD COLUMN numero_parcela INTEGER NOT NULL DEFAULT 1;");
  }

  const colunasAplicacoes = await db.getAllAsync<{ name: string }>("PRAGMA table_info(aplicacoes)");
  if (!colunasAplicacoes.some((c) => c.name === "banco_id")) {
    await db.execAsync("ALTER TABLE aplicacoes ADD COLUMN banco_id INTEGER;");
  }

  // Converte os nomes de banco já digitados nas aplicações em cadastros vinculados.
  const bancosAntigos = await db.getAllAsync<{ banco: string }>(
    "SELECT DISTINCT banco FROM aplicacoes WHERE TRIM(banco) <> '' AND banco_id IS NULL"
  );
  for (const antigo of bancosAntigos) {
    await db.runAsync(
      "INSERT OR IGNORE INTO bancos (nome, cor) VALUES (?, ?)",
      [antigo.banco.trim(), "#1565C0"]
    );
  }
  await db.execAsync(`
    UPDATE aplicacoes
    SET banco_id = (SELECT id FROM bancos WHERE bancos.nome = aplicacoes.banco COLLATE NOCASE)
    WHERE banco_id IS NULL;
  `);

}

// Abre o banco uma única vez e reaproveita a conexão
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(NOME_BANCO)
      .then(async (db) => {
        await criarTabelas(db);
        return db;
      })
      .catch((erro) => {
        dbPromise = null; // permite tentar de novo se falhar
        throw erro;
      });
  }
  return dbPromise;
}
