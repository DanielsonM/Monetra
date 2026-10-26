import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { listarDespesas, type Despesa } from "../database/dbGestor/dbDespesas";
// ---------------------------------------------------------------------------
// Configurações (ajuste aqui)
// ---------------------------------------------------------------------------
const CANAL_ID = "vencimentos";
const HORA_AVISO = 9; // hora do aviso (09:00)
const MINUTO_AVISO = 0;
const DIAS_AVISO_ATRASO = 5; // quantos dias seguidos avisar "já venceu"
const LIMITE_AGENDADAS = 60; // o iOS aceita no máximo 64 notificações agendadas

// Como a notificação se comporta com o app aberto (aparece como banner)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ---------------------------------------------------------------------------
// Canal (Android) e permissão
// ---------------------------------------------------------------------------
async function configurarCanal() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(CANAL_ID, {
    name: "Vencimentos de despesas",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export async function pedirPermissaoNotificacoes(): Promise<boolean> {
  // No Android 13+ o canal precisa existir antes de pedir a permissão
  await configurarCanal();

  const atual = await Notifications.getPermissionsAsync();
  if (atual.granted) return true;
  if (!atual.canAskAgain) return false;

  const pedido = await Notifications.requestPermissionsAsync();
  return pedido.granted;
}

// ---------------------------------------------------------------------------
// Montagem dos avisos de cada despesa
// ---------------------------------------------------------------------------
type Aviso = {
  quando: Date;
  titulo: string;
  texto: string;
  despesaId: number;
};

// Data do aviso = vencimento + deslocamento em dias, no horário configurado
function dataDoAviso(iso: string, deslocamentoDias: number) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(
    ano,
    mes - 1,
    dia + deslocamentoDias,
    HORA_AVISO,
    MINUTO_AVISO,
    0,
    0
  );
}

// Quantos dias se passaram desde o vencimento (negativo = ainda não venceu)
function diasDesdeVencimento(iso: string) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const vencimento = new Date(ano, mes - 1, dia);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((hoje.getTime() - vencimento.getTime()) / 86400000);
}

function montarAvisos(d: Despesa): Aviso[] {
  const nome = `"${d.nome}"`;
  const valor = formatarMoeda(d.valor);
  const diasHoje = diasDesdeVencimento(d.vencimento);
  const avisos: Aviso[] = [];

  // Um dia antes: "vence amanhã"
  if (diasHoje <= -1) {
    avisos.push({
      quando: dataDoAviso(d.vencimento, -1),
      titulo: "Despesa vence amanhã",
      texto: `A despesa ${nome} vence amanhã (${valor}).`,
      despesaId: d.id,
    });
  }

  // No dia: "vence hoje"
  if (diasHoje <= 0) {
    avisos.push({
      quando: dataDoAviso(d.vencimento, 0),
      titulo: "Despesa vence hoje",
      texto: `A despesa ${nome} vence hoje (${valor}).`,
      despesaId: d.id,
    });
  }

  // Depois do vencimento: "já venceu" nos próximos dias, contando a partir de hoje
  const primeiroDiaAtraso = Math.max(1, diasHoje);
  for (let i = 0; i < DIAS_AVISO_ATRASO; i++) {
    const atraso = primeiroDiaAtraso + i;
    avisos.push({
      quando: dataDoAviso(d.vencimento, atraso),
      titulo: "Despesa vencida",
      texto:
        atraso === 1
          ? `A despesa ${nome} já venceu (venceu ontem). Valor: ${valor}.`
          : `A despesa ${nome} já venceu há ${atraso} dias. Valor: ${valor}.`,
      despesaId: d.id,
    });
  }

  return avisos;
}

// ---------------------------------------------------------------------------
// Sincronização: apaga o que estava agendado e agenda de novo só as despesas
// que NÃO estão pagas. Chame sempre que algo mudar (cadastrar, pagar, excluir).
// ---------------------------------------------------------------------------
async function executarSincronizacao() {
  const permitido = await pedirPermissaoNotificacoes();

  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!permitido) return;

  const despesas = (await listarDespesas()).filter((d) => !d.pago);
  const limite = Date.now() + 5000; // ignora horários que já passaram

  const avisos = despesas
    .flatMap(montarAvisos)
    .filter((a) => a.quando.getTime() > limite)
    .sort((a, b) => a.quando.getTime() - b.quando.getTime())
    .slice(0, LIMITE_AGENDADAS);

  for (const a of avisos) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: a.titulo,
        body: a.texto,
        sound: true,
        data: { despesaId: a.despesaId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: a.quando,
        channelId: CANAL_ID,
      },
    });
  }
}

// Fila: evita duas sincronizações ao mesmo tempo (o que duplicaria avisos)
let fila: Promise<void> = Promise.resolve();

export function sincronizarNotificacoes(): Promise<void> {
  fila = fila
    .then(executarSincronizacao)
    .catch((erro) => console.error("Erro ao agendar notificações:", erro));
  return fila;
}

// ---------------------------------------------------------------------------
// Teste rápido: dispara uma notificação em 5 segundos
// ---------------------------------------------------------------------------
export async function testarNotificacao() {
  const permitido = await pedirPermissaoNotificacoes();
  if (!permitido) {
    console.warn("Permissão de notificações negada.");
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Teste do Monetra",
      body: "Se você está vendo isso, as notificações funcionam.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: CANAL_ID,
    },
  });
}