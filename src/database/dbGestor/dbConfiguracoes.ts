import { getDb } from "../db";

export type ConfigNotificacao = {
  diasAntesProvisao: number; // quantos dias antes do vencimento começa a avisar
  intervaloHoras: number; // de quantas em quantas horas avisa
  horaInicio: number; // primeiro horário do dia (0-23)
  horaFim: number; // último horário do dia (0-23)
  avisarAposProvisao: boolean; // continua avisando depois do vencimento, se não paga
};

export const CONFIG_PADRAO: ConfigNotificacao = {
  diasAntesProvisao: 2,
  intervaloHoras: 6,
  horaInicio: 8,
  horaFim: 20,
  avisarAposProvisao: true,
};

const CHAVE = "notificacoes";
const CHAVE_AVISO_BATERIA_INICIAL = "aviso_bateria_inicial";

export async function consumirAvisoBateriaInicial(): Promise<boolean> {
  const db = await getDb();
  const existente = await db.getFirstAsync<{ valor: string }>(
    "SELECT valor FROM configuracoes WHERE chave = ?",
    [CHAVE_AVISO_BATERIA_INICIAL]
  );
  if (existente) return false;
  await db.runAsync(
    "INSERT INTO configuracoes (chave, valor) VALUES (?, '1')",
    [CHAVE_AVISO_BATERIA_INICIAL]
  );
  return true;
}

export async function carregarConfigNotificacao(): Promise<ConfigNotificacao> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ valor: string }>(
    "SELECT valor FROM configuracoes WHERE chave = ?",
    [CHAVE]
  );
  if (!r) return CONFIG_PADRAO;

  try {
    const salvo = JSON.parse(r.valor) as Partial<ConfigNotificacao> & { diasAntes?: number; avisarAposVencer?: boolean };
    return {
      ...CONFIG_PADRAO,
      ...salvo,
      diasAntesProvisao: salvo.diasAntesProvisao ?? salvo.diasAntes ?? CONFIG_PADRAO.diasAntesProvisao,
      avisarAposProvisao: salvo.avisarAposProvisao ?? salvo.avisarAposVencer ?? CONFIG_PADRAO.avisarAposProvisao,
    };
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
