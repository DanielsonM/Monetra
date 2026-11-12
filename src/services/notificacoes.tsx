import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  type ConfigNotificacao,
  carregarConfigNotificacao,
} from "../database/dbGestor/dbConfiguracoes";
import {
  type Despesa,
  listarDespesas,
  renovarPendentes,
} from "../database/dbGestor/dbDespesas";
import { listarReceitas } from "../database/dbGestor/dbReceitas";
import { dataISOparaBR } from "../utils/converterData";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------
const CANAL_ID = "vencimentos";
const LIMITE_AGENDADAS = 60; // o iOS aceita no máximo 64 notificações agendadas
const DIAS_PONTE = 2; // dias após o vencimento cobertos mesmo sem abrir o app

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
// Horários do dia: do início ao fim, de X em X horas (ex.: 8, 14, 20)
// ---------------------------------------------------------------------------
export function horariosDoDia(c: ConfigNotificacao): number[] {
  const horas: number[] = [];
  for (let h = c.horaInicio; h <= c.horaFim; h += Math.max(1, c.intervaloHoras)) {
    horas.push(h);
  }
  return horas;
}

// ---------------------------------------------------------------------------
// Montagem dos avisos para o vencimento de cada despesa
// ---------------------------------------------------------------------------
type Aviso = {
  titulo: string;
  texto: string;
  despesaId: number;
  quando?: Date; // aviso em uma data específica
  hora?: number; // aviso que se repete todo dia nesse horário
};

// Data do aviso = vencimento + deslocamento em dias, na hora indicada
function dataDoAviso(iso: string, deslocamentoDias: number, hora: number) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia + deslocamentoDias, hora, 0, 0, 0);
}

// Quantos dias se passaram desde o vencimento (negativo = ainda não chegou)
function diasDesdeVencimento(iso: string) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const vencimento = new Date(ano, mes - 1, dia);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((hoje.getTime() - vencimento.getTime()) / 86400000);
}

function montarAvisos(d: Despesa, c: ConfigNotificacao): Aviso[] {
  const nome = `"${d.nome}"`;
  const valor = formatarMoeda(Math.max(0, d.valor - (d.valor_pago ?? 0)));
  const vencimentoEm = dataISOparaBR(d.provisao).slice(0, 5);
  const horas = horariosDoDia(c);
  const diasHoje = diasDesdeVencimento(d.provisao);
  const avisos: Aviso[] = [];

  const textoAtrasada = `O vencimento da despesa ${nome} era ${vencimentoEm} e ainda está pendente (${valor}).`;

  // Já atrasada: repete todo dia, nos horários, até ser paga
  if (diasHoje >= 1) {
    if (c.avisarAposProvisao) {
      for (const hora of horas) {
        avisos.push({
          titulo: "Despesa vencida",
          texto: textoAtrasada,
          despesaId: d.id,
          hora,
        });
      }
    }
    return avisos;
  }

  // Antes do vencimento e no próprio dia
  for (let offset = -c.diasAntesProvisao; offset <= 0; offset++) {
    let titulo: string;
    let texto: string;

    if (offset === 0) {
      titulo = "Vencimento da despesa hoje";
      texto = `A despesa ${nome} vence hoje (${valor}).`;
    } else if (offset === -1) {
      titulo = "Vencimento da despesa amanhã";
      texto = `A despesa ${nome} vence amanhã (${valor}).`;
    } else {
      titulo = `Vencimento da despesa em ${-offset} dias`;
      texto = `A despesa ${nome} vence daqui a ${-offset} dias (${valor}).`;
    }

    for (const hora of horas) {
      avisos.push({
        titulo,
        texto,
        despesaId: d.id,
        quando: dataDoAviso(d.provisao, offset, hora),
      });
    }
  }

  // Ponte: cobre os primeiros dias após o vencimento caso o app não seja aberto
  if (c.avisarAposProvisao) {
    for (let offset = 1; offset <= DIAS_PONTE; offset++) {
      for (const hora of horas) {
        avisos.push({
          titulo: "Despesa vencida",
          texto: textoAtrasada,
          despesaId: d.id,
          quando: dataDoAviso(d.provisao, offset, hora),
        });
      }
    }
  }

  return avisos;
}

// ---------------------------------------------------------------------------
// Sincronização: apaga o que estava agendado e agenda de novo só as despesas
// que NÃO estão pagas. Chame sempre que algo mudar (cadastrar, pagar, excluir,
// salvar configurações) e ao abrir o app.
// ---------------------------------------------------------------------------
async function executarSincronizacao() {
  await renovarPendentes();
  const [todasDespesas, receitas, apresentadas] = await Promise.all([
    listarDespesas(),
    listarReceitas(),
    Notifications.getPresentedNotificationsAsync(),
  ]);

  const despesasPorId = new Map(todasDespesas.map((despesa) => [despesa.id, despesa]));
  const receitasPorId = new Map(receitas.map((receita) => [receita.id, receita]));
  for (const notificacao of apresentadas) {
    const dados = notificacao.request.content.data as {
      despesaId?: unknown;
      provisao?: unknown;
      receitaId?: unknown;
      vencimento?: unknown;
    } | undefined;
    if (!dados) continue;

    const idDespesa = Number(dados.despesaId);
    const despesa = Number.isInteger(idDespesa) ? despesasPorId.get(idDespesa) : undefined;
    const despesaLiquidadaOuRemovida = dados.despesaId !== undefined &&
      (!despesa || Boolean(despesa.pago) || (typeof dados.provisao === "string" && dados.provisao !== despesa.provisao));

    const idReceita = Number(dados.receitaId);
    const receita = Number.isInteger(idReceita) ? receitasPorId.get(idReceita) : undefined;
    const receitaRecebidaOuRemovida = dados.receitaId !== undefined &&
      (!receita || Boolean(receita.recebido) || (typeof dados.vencimento === "string" && dados.vencimento !== receita.vencimento));

    if (despesaLiquidadaOuRemovida || receitaRecebidaOuRemovida) {
      await Notifications.dismissNotificationAsync(notificacao.request.identifier);
    }
  }

  const permitido = await pedirPermissaoNotificacoes();
  if (!permitido) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.warn("Notificações desativadas: permissão não concedida.");
    return;
  }

  const config = await carregarConfigNotificacao();
  const despesas = todasDespesas.filter((d) => !d.pago);
  const limite = Date.now() + 5000; // ignora horários que já passaram

  const todos = despesas.flatMap((d) => montarAvisos(d, config));

  // Os recorrentes (despesas já atrasadas) têm prioridade
  const recorrentes = todos
    .filter((a) => a.hora !== undefined)
    .slice(0, LIMITE_AGENDADAS);

  // O restante entra por ordem de data, até completar o limite do sistema
  const datados = todos
    .filter((a) => a.quando && a.quando.getTime() > limite)
    .sort((a, b) => a.quando!.getTime() - b.quando!.getTime())
    .slice(0, LIMITE_AGENDADAS - recorrentes.length);

  const agendamentos = [...recorrentes, ...datados];
  await Notifications.cancelAllScheduledNotificationsAsync();
  let agendadas = 0;
  for (const a of agendamentos) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: a.titulo,
          body: a.texto,
          sound: true,
          data: {
            despesaId: a.despesaId,
            provisao: despesasPorId.get(a.despesaId)?.provisao,
          },
        },
        trigger:
          a.hora !== undefined
            ? {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: a.hora,
                minute: 0,
                channelId: CANAL_ID,
              }
            : {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: a.quando!,
                channelId: CANAL_ID,
              },
      });
      agendadas++;
    } catch (erro) {
      console.error(`Falha ao agendar aviso da despesa ${a.despesaId}:`, erro);
    }
  }
  console.info(`Notificações de vencimento agendadas: ${agendadas}/${agendamentos.length}.`);
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
