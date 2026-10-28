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
      vencimento TEXT NOT NULL,
      pago INTEGER NOT NULL DEFAULT 0,
      observacao TEXT,
      fixa INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS configuracoes (
      chave TEXT PRIMARY KEY NOT NULL,
      valor TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pagamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      despesa_id INTEGER,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL,
      valor REAL NOT NULL,
      vencimento TEXT NOT NULL,
      data_pagamento TEXT NOT NULL DEFAULT (date('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS receitas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      valor REAL NOT NULL,
      tipo TEXT NOT NULL,
      data TEXT NOT NULL,
      vencimento TEXT NOT NULL,
      observacao TEXT,
      recebido INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
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
