import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    type GastoTipo,
    type ResumoMes,
    gastosPorTipo,
    resumoPorMes,
    ultimosMeses,
} from "../../database/dbGestor/dbHistorico";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const MESES_CURTOS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const COR_ENTRADA = "#2E7D32";
const COR_GASTO = "#D32F2F";
const PALETA = [
  "#D32F2F",
  "#F57C00",
  "#1976D2",
  "#6A1B9A",
  "#00897B",
  "#C2185B",
  "#5D4037",
  "#455A64",
];

const ALTURA_GRAFICO = 140;
const QTD_MESES_GRAFICO = 6;

const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// "2026-10" -> "Outubro 2026"
const rotuloMes = (chave: string) => {
  const [ano, mes] = chave.split("-").map(Number);
  return `${MESES[mes - 1]} ${ano}`;
};

// "2026-10" -> "Out"
const rotuloCurto = (chave: string) =>
  MESES_CURTOS[Number(chave.slice(5, 7)) - 1];

// 1250 -> "1,3k"
const compacto = (valor: number) =>
  valor >= 1000
    ? `${(valor / 1000).toFixed(1).replace(".", ",")}k`
    : String(Math.round(valor));

const formatarSobra = (valor: number) =>
  `${valor >= 0 ? "+" : "-"}${compacto(Math.abs(valor))}`;

export default function Historico() {
  const router = useRouter();
  const [resumo, setResumo] = useState<ResumoMes[]>([]);
  const [mesSel, setMesSel] = useState(ultimosMeses(1)[0]);
  const [porTipo, setPorTipo] = useState<GastoTipo[]>([]);

  const voltar = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/home/home");
    }
  };

  // Recarrega ao abrir a tela e sempre que troca o mês selecionado
  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      (async () => {
        try {
          const r = await resumoPorMes(12);
          const t = await gastosPorTipo(mesSel);
          if (ativo) {
            setResumo(r);
            setPorTipo(t);
          }
        } catch (erro) {
          console.error(erro);
        }
      })();

      return () => {
        ativo = false;
      };
    }, [mesSel])
  );

  const indice = resumo.findIndex((r) => r.mes === mesSel);
  const atual: ResumoMes = resumo[indice] ?? {
    mes: mesSel,
    entradas: 0,
    gastos: 0,
    sobra: 0,
  };

  const mudarMes = (delta: number) => {
    const novo = resumo[indice + delta];
    if (novo) setMesSel(novo.mes);
  };

  // Gráfico de barras dos últimos meses
  const grafico = resumo.slice(-QTD_MESES_GRAFICO);
  const maximo = Math.max(1, ...grafico.flatMap((m) => [m.entradas, m.gastos]));
  const alturaBarra = (valor: number) =>
    valor <= 0 ? 0 : Math.max(3, (valor / maximo) * ALTURA_GRAFICO);

  // Gastos por tipo no mês selecionado
  const totalTipos = porTipo.reduce((soma, t) => soma + t.total, 0);
  const maxTipo = Math.max(1, ...porTipo.map((t) => t.total));

  // Lista mês a mês (só meses com movimento), do mais recente ao mais antigo
  const meses = [...resumo]
    .reverse()
    .filter((m) => m.entradas > 0 || m.gastos > 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabeçalho com botão de voltar */}
      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={voltar} hitSlop={10} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={28} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Histórico</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.conteudo}
      >
        {/* Seletor de mês */}
        <View style={styles.seletor}>
          <TouchableOpacity
            onPress={() => mudarMes(-1)}
            disabled={indice <= 0}
            style={[styles.seta, indice <= 0 && styles.setaDesabilitada]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
          </TouchableOpacity>

          <Text style={styles.seletorTexto}>{rotuloMes(mesSel)}</Text>

          <TouchableOpacity
            onPress={() => mudarMes(1)}
            disabled={indice < 0 || indice >= resumo.length - 1}
            style={[
              styles.seta,
              (indice < 0 || indice >= resumo.length - 1) &&
                styles.setaDesabilitada,
            ]}
            hitSlop={8}
          >
            <Ionicons name="chevron-forward" size={22} color="#1A1A1A" />
          </TouchableOpacity>
        </View>

        {/* Resumo do mês selecionado */}
        <View
          style={[
            styles.cardSobra,
            { backgroundColor: atual.sobra >= 0 ? COR_ENTRADA : COR_GASTO },
          ]}
        >
          <Text style={styles.cardSobraLabel}>
            {atual.sobra >= 0 ? "Sobrou no mês" : "Faltou no mês"}
          </Text>
          <Text style={styles.cardSobraValor}>
            {formatarMoeda(Math.abs(atual.sobra))}
          </Text>
        </View>

        <View style={styles.linhaCards}>
          <View style={styles.cardPequeno}>
            <Text style={styles.cardPequenoLabel}>Entradas</Text>
            <Text style={[styles.cardPequenoValor, { color: COR_ENTRADA }]}>
              {formatarMoeda(atual.entradas)}
            </Text>
          </View>

          <View style={styles.cardPequeno}>
            <Text style={styles.cardPequenoLabel}>Gastos</Text>
            <Text style={[styles.cardPequenoValor, { color: COR_GASTO }]}>
              {formatarMoeda(atual.gastos)}
            </Text>
          </View>
        </View>

        {/* Gráfico dos últimos meses */}
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Últimos {QTD_MESES_GRAFICO} meses</Text>

          <View style={styles.legenda}>
            <View style={styles.legendaItem}>
              <View
                style={[styles.legendaCor, { backgroundColor: COR_ENTRADA }]}
              />
              <Text style={styles.legendaTexto}>Entradas</Text>
            </View>
            <View style={styles.legendaItem}>
              <View
                style={[styles.legendaCor, { backgroundColor: COR_GASTO }]}
              />
              <Text style={styles.legendaTexto}>Gastos</Text>
            </View>
          </View>

          <View style={styles.grafico}>
            {grafico.map((m) => {
              const selecionado = m.mes === mesSel;

              return (
                <TouchableOpacity
                  key={m.mes}
                  style={[styles.coluna, selecionado && styles.colunaSel]}
                  onPress={() => setMesSel(m.mes)}
                  activeOpacity={0.7}
                >
                  <View style={styles.barras}>
                    <View
                      style={[
                        styles.barra,
                        {
                          height: alturaBarra(m.entradas),
                          backgroundColor: COR_ENTRADA,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.barra,
                        {
                          height: alturaBarra(m.gastos),
                          backgroundColor: COR_GASTO,
                        },
                      ]}
                    />
                  </View>

                  <Text
                    style={[styles.colunaMes, selecionado && styles.colunaMesSel]}
                  >
                    {rotuloCurto(m.mes)}
                  </Text>
                  <Text
                    style={[
                      styles.colunaSobra,
                      { color: m.sobra >= 0 ? COR_ENTRADA : COR_GASTO },
                    ]}
                  >
                    {formatarSobra(m.sobra)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.dica}>
            O número abaixo de cada mês é quanto sobrou (+) ou faltou (-), em
            reais. Toque em um mês para ver os detalhes.
          </Text>
        </View>

        {/* Gastos por tipo no mês selecionado */}
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>
            Gastos por tipo · {rotuloCurto(mesSel)}
          </Text>

          {porTipo.length === 0 && (
            <Text style={styles.vazio}>
              Nenhum pagamento registrado neste mês.
            </Text>
          )}

          {porTipo.map((t, i) => {
            const cor = PALETA[i % PALETA.length];

            return (
              <View key={t.tipo} style={styles.tipoLinha}>
                <View style={styles.tipoTopo}>
                  <View style={styles.tipoNomeBox}>
                    <View style={[styles.tipoPonto, { backgroundColor: cor }]} />
                    <Text style={styles.tipoNome}>{t.tipo}</Text>
                  </View>
                  <Text style={styles.tipoValor}>
                    {formatarMoeda(t.total)} ·{" "}
                    {Math.round((t.total / totalTipos) * 100)}%
                  </Text>
                </View>

                <View style={styles.tipoTrilho}>
                  <View
                    style={[
                      styles.tipoBarra,
                      {
                        width: `${(t.total / maxTipo) * 100}%` as const,
                        backgroundColor: cor,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {/* Mês a mês em números */}
        <Text style={styles.secaoTitulo}>Mês a mês</Text>

        {meses.length === 0 && (
          <Text style={styles.vazio}>
            Ainda não há movimento. O histórico de gastos começa a ser
            registrado a partir do primeiro pagamento confirmado no app.
          </Text>
        )}

        {meses.map((m) => (
          <TouchableOpacity
            key={m.mes}
            style={styles.cardMes}
            onPress={() => setMesSel(m.mes)}
            activeOpacity={0.8}
          >
            <View style={styles.cardMesTopo}>
              <Text style={styles.cardMesNome}>{rotuloMes(m.mes)}</Text>
              <Text
                style={[
                  styles.cardMesSobra,
                  { color: m.sobra >= 0 ? COR_ENTRADA : COR_GASTO },
                ]}
              >
                {m.sobra >= 0 ? "Sobrou " : "Faltou "}
                {formatarMoeda(Math.abs(m.sobra))}
              </Text>
            </View>

            <Text style={styles.cardMesDetalhe}>
              Entradas {formatarMoeda(m.entradas)} · Gastos{" "}
              {formatarMoeda(m.gastos)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 20 },

  conteudo: { paddingBottom: 30 },

  // Cabeçalho com seta de voltar
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  titulo: { fontSize: 28, fontWeight: "bold", color: "#1A1A1A" },

  // Seletor de mês
  seletor: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  seta: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  setaDesabilitada: { opacity: 0.35 },
  seletorTexto: { fontSize: 20, fontWeight: "bold", color: "#1A1A1A" },

  // Card grande: sobrou / faltou
  cardSobra: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 12,
    alignItems: "center",

    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  cardSobraLabel: { fontSize: 15, color: "#FFFFFF", opacity: 0.9 },
  cardSobraValor: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 4,
  },

  // Cards pequenos: entradas e gastos
  linhaCards: { flexDirection: "row", gap: 12, marginBottom: 12 },
  cardPequeno: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,

    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardPequenoLabel: { fontSize: 13, color: "#666666" },
  cardPequenoValor: { fontSize: 17, fontWeight: "bold", marginTop: 4 },

  // Cards de conteúdo
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,

    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitulo: { fontSize: 17, fontWeight: "bold", color: "#1A1A1A" },

  // Legenda do gráfico
  legenda: { flexDirection: "row", gap: 16, marginTop: 10 },
  legendaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendaCor: { width: 12, height: 12, borderRadius: 3 },
  legendaTexto: { fontSize: 12, color: "#666666" },

  // Gráfico de barras
  grafico: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 16,
    gap: 4,
  },
  coluna: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: 10,
  },
  colunaSel: { backgroundColor: "#F1F8E9" },
  barras: {
    height: ALTURA_GRAFICO,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
  },
  barra: { width: 14, borderRadius: 4 },
  colunaMes: { fontSize: 12, color: "#666666", marginTop: 6 },
  colunaMesSel: { color: "#1A1A1A", fontWeight: "bold" },
  colunaSobra: { fontSize: 11, fontWeight: "bold", marginTop: 2 },

  dica: { fontSize: 12, color: "#888888", marginTop: 12 },

  // Gastos por tipo
  tipoLinha: { marginTop: 14 },
  tipoTopo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  tipoNomeBox: { flexDirection: "row", alignItems: "center", gap: 8 },
  tipoPonto: { width: 10, height: 10, borderRadius: 5 },
  tipoNome: { fontSize: 15, color: "#1A1A1A", fontWeight: "bold" },
  tipoValor: { fontSize: 13, color: "#555555" },
  tipoTrilho: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EEEEEE",
    overflow: "hidden",
  },
  tipoBarra: { height: 8, borderRadius: 4 },

  vazio: { fontSize: 14, color: "#999999", marginTop: 12, marginBottom: 12 },

  // Lista mês a mês
  secaoTitulo: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginBottom: 12,
  },
  cardMes: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,

    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardMesTopo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardMesNome: { fontSize: 16, fontWeight: "bold", color: "#1A1A1A" },
  cardMesSobra: { fontSize: 15, fontWeight: "bold" },
  cardMesDetalhe: { fontSize: 13, color: "#666666", marginTop: 6 },
});