import { getDb } from "../db";

export type Tag = { id: number; nome: string; criado_em: string };

export async function listarTags(): Promise<Tag[]> {
  const db = await getDb();
  return db.getAllAsync<Tag>("SELECT * FROM tags ORDER BY nome COLLATE NOCASE");
}

export async function criarTag(nome: string) {
  const valor = nome.trim().replace(/\s+/g, " ");
  if (!valor) throw new Error("Informe o nome da tag.");
  const db = await getDb();
  try {
    await db.runAsync("INSERT INTO tags (nome) VALUES (?)", [valor]);
  } catch (erro) {
    if (String(erro).toLocaleLowerCase().includes("unique")) throw new Error("Já existe uma tag com esse nome.");
    throw erro;
  }
}

export async function excluirTag(id: number) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const tabela of ["despesas", "receitas"] as const) {
      const linhas = await db.getAllAsync<{ id: number; tags_ids: string }>(`SELECT id, tags_ids FROM ${tabela} WHERE tags_ids LIKE ?`, [`%${id}%`]);
      for (const linha of linhas) {
        const ids = lerTags(linha.tags_ids).filter((tagId) => tagId !== id);
        await db.runAsync(`UPDATE ${tabela} SET tags_ids = ? WHERE id = ?`, [JSON.stringify(ids), linha.id]);
      }
    }
    await db.runAsync("DELETE FROM tags WHERE id = ?", [id]);
  });
}

export function lerTags(valor?: string | null): number[] {
  if (!valor) return [];
  try {
    const dados: unknown = JSON.parse(valor);
    return Array.isArray(dados) ? dados.filter((id): id is number => Number.isInteger(id) && id > 0) : [];
  } catch {
    return [];
  }
}
