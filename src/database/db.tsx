import * as SQLite from "expo-sqlite";

const NOME_BANCO = "monetra.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// Cria as tabelas. Para mudar o banco no futuro, adicione um novo "else if (versao < 3)"
async function migrar(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version"
  );
  const versao = row?.user_version ?? 0;

  if (versao < 1) {
    // Banco novo: já cria tudo com a coluna "pago" e pula direto para a versão 2
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS despesas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        valor REAL NOT NULL,
        tipo TEXT NOT NULL,
        vencimento TEXT NOT NULL,
        pago INTEGER NOT NULL DEFAULT 0,
        criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS saldos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        valor REAL NOT NULL,
        tipo TEXT NOT NULL,
        criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      PRAGMA user_version = 2;
    `);
  } 
  
  if (versao < 2) {
    // Banco antigo (versão 1): só adiciona a coluna "pago"
    await db.execAsync(`
      ALTER TABLE despesas ADD COLUMN pago INTEGER NOT NULL DEFAULT 0;
      PRAGMA user_version = 2;
    `);
  }

  if (versao < 3) {
  await db.execAsync(`
    ALTER TABLE despesas ADD COLUMN observacao TEXT;
    PRAGMA user_version = 3;
  `);
}
}

// Abre o banco uma única vez e reaproveita a conexão
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(NOME_BANCO)
      .then(async (db) => {
        await migrar(db);

        const r = await db.getFirstAsync<{ user_version: number }>(
          "PRAGMA user_version"
        );
        console.log("Versão do banco:", r?.user_version);

        return db;
      })
      .catch((erro) => {
        dbPromise = null; // permite tentar de novo se falhar
        throw erro;
      });
  }
  return dbPromise;
}