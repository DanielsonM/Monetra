import { getDb } from "../db";

export type ConfigNotificacao = {
  diasAntes: number; // quantos dias antes do vencimento começa a avisar
  intervaloHoras: number; // de quantas em quantas horas avisa
  horaInicio: number; // primeiro horário do dia (0-23)
  horaFim: number; // último horário do dia (0-23)
  avisarAposVencer: boolean; // continua avisando depois de vencida, se não paga
};

export const CONFIG_PADRAO: ConfigNotificacao = {
  diasAntes: 2,
  intervaloHoras: 6,
  horaInicio: 8,
  horaFim: 20,
  avisarAposVencer: true,
};

const CHAVE = "notificacoes";

export async function carregarConfigNotificacao(): Promise<ConfigNotificacao> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ valor: string }>(
    "SELECT valor FROM configuracoes WHERE chave = ?",
    [CHAVE]
  );
  if (!r) return CONFIG_PADRAO;

  try {
    return { ...CONFIG_PADRAO, ...JSON.parse(r.valor) };
  } catch {
    return CONFIG_PADRAO;
  }
}

export async function salvarConfigNotificacao(c: ConfigNotificacao) {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)",
    [CHAVE, JSON.stringify(c)]
  );
}