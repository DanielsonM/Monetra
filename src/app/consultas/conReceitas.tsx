import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InfoButton from "../../components/infoButton";
import {
  excluirReceita,
  listarReceitas,
  receberReceita,
  type Receita,
} from "../../database/dbGestor/dbReceitas";
import { dataISOparaBR } from "../../utils/converterData";

// Situação de cada receita:
// - recebida: já foi recebida (entra no saldo disponível)
// - vencida: não foi recebida e o vencimento já passou
// - areceber: não foi recebida e ainda está no prazo (vence hoje ou depois)
type StatusReceita = "recebida" | "areceber" | "vencida";
type Filtro = "todas" | "recebidas" | "areceber" | "vencidas";

const FILTROS: { chave: Filtro; rotulo: string }[] = [
  { chave: "todas", rotulo: "Todas" },
  { chave: "recebidas", rotulo: "Recebidas" },
  { chave: "areceber", rotulo: "A receber" },
  { chave: "vencidas", rotulo: "Vencidas" },
];

const STATUS_DO_FILTRO: Record<Exclude<Filtro, "todas">, StatusReceita> = {
  recebidas: "recebida",
  areceber: "areceber",
  vencidas: "vencida",
};

const TEXTO_STATUS: Record<StatusReceita, string> = {
  recebida: "Recebida",
  areceber: "A receber",
  vencida: "Vencida",
};

const MENSAGEM_VAZIO: Record<Filtro, string> = {
  todas: "Nenhuma receita cadastrada",
  recebidas: "Nenhuma receita recebida",
  areceber: "Nenhuma receita a receber",
  vencidas: "Nenhuma receita vencida",
};

// Formata valores para Real brasileiro
const formatarReal = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Data de hoje no horário local (AAAA-MM-DD). Não usa toISOString, que
// converte para UTC e pode mudar o dia dependendo do horário
const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Define a situação da receita (datas em AAAA-MM-DD comparam bem como texto)
const statusDe = (r: Receita, hoje: string): StatusReceita => {
  if (r.recebido === 1) return "recebida";
  return r.vencimento < hoje ? "vencida" : "areceber";
};

export default function ConReceita() {
  const router = useRouter();

  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("todas");

  const hoje = hojeISO();

  // Totais gerais (card de resumo)
  const total = receitas.reduce((soma, r) => soma + r.valor, 0);
  const totalRecebido = receitas.reduce(
    (soma, r) => (r.recebido === 1 ? soma + r.valor : soma),
    0
  );

  // Quantidade de receitas em cada filtro
  const contagem: Record<Filtro, number> = {
    todas: receitas.length,
    recebidas: 0,
    areceber: 0,
    vencidas: 0,
  };
  for (const r of receitas) {
    const status = statusDe(r, hoje);
    if (status === "recebida") contagem.recebidas++;
    else if (status === "vencida") contagem.vencidas++;
    else contagem.areceber++;
  }

  // Lista exibida de acordo com o filtro escolhido
  const filtradas =
    filtro === "todas"
      ? receitas
      : receitas.filter(
          (r) => statusDe(r, hoje) === STATUS_DO_FILTRO[filtro]
        );
  const totalFiltrado = filtradas.reduce((soma, r) => soma + r.valor, 0);

  const voltar = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/home/home");
    }
  };

  // Abre o cadastro vazio, para uma nova receita
  const adicionar = () => {
    router.push("/cadastros/cadReceita" as never);
  };

  const unificar = () => {
    router.push("/consultas/unificarReceitas" as never);
  };

  // Abre o cadastro em modo edição, com os dados da receita carregados
  const editar = (receita: Receita) => {
    router.push({
      pathname: "/cadastros/cadReceita",
      params: { id: String(receita.id) },
    } as never);
  };

  const carregar = useCallback(async () => {
    try {
      setReceitas(await listarReceitas());
    } catch (erro) {
      console.error(erro);
      Alert.alert("Erro", "Não foi possível carregar as receitas.");
    } finally {
      setCarregando(false);
    }
  }, []);

  // Recarrega sempre que a tela volta a ficar em foco
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const confirmarExclusao = (receita: Receita) => {
    Alert.alert(
      "Excluir receita",
      `Deseja excluir "${receita.nome}" (${formatarReal(receita.valor)})?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await excluirReceita(receita.id);
              await carregar();
            } catch (erro) {
              console.error(erro);
              Alert.alert("Erro", "Não foi possível excluir a receita.");
            }
          },
        },
      ]
    );
  };

  const confirmarRecebimento = (receita: Receita) => {
    Alert.alert(
      "Confirmar recebimento",
      `Marcar "${receita.nome}" (${formatarReal(receita.valor)}) como recebida?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Marcar como recebida",
          onPress: async () => {
            try {
              await receberReceita(receita.id);
              await carregar();
            } catch (erro) {
              console.error(erro);
              Alert.alert("Erro", "Não foi possível registrar o recebimento.");
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Receita }) => {
    const status = statusDe(item, hoje);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => editar(item)}
      >
        <View style={styles.cardInfo}>
          <Text style={styles.nome}>{item.nome}</Text>
          <Text style={styles.detalhe}>{item.tipo}</Text>
          <Text style={styles.detalhe}>
            Entrada: {dataISOparaBR(item.data)} · Venc.:{" "}
            {dataISOparaBR(item.vencimento)}
          </Text>
          {item.observacao ? (
            <Text style={styles.observacao}>{item.observacao}</Text>
          ) : null}
          <Text
            style={[
              styles.status,
              status === "recebida" && styles.statusRecebido,
              status === "areceber" && styles.statusPendente,
              status === "vencida" && styles.statusVencida,
            ]}
          >
            {TEXTO_STATUS[status]}
          </Text>
        </View>

        <View style={styles.cardDireita}>
          <Text style={styles.valor}>{formatarReal(item.valor)}</Text>
          {status !== "recebida" && (
            <TouchableOpacity
              style={styles.botaoReceber}
              onPress={() => confirmarRecebimento(item)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Marcar ${item.nome} como recebida`}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
              <Text style={styles.botaoReceberTexto}>Receber</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => confirmarExclusao(item)}
            hitSlop={10}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color="#D32F2F" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabeçalho com botão de voltar */}
      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={voltar} hitSlop={10} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={28} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Receitas</Text>
        <InfoButton compacto titulo="Consulta de receitas" texto="Veja e gerencie as receitas cadastradas. O botão + cria uma receita; use a ação de recebimento para registrar quando o valor entrar. Em Unificar receitas a receber, escolha a receita que continuará e a que será somada. A operação fica em Históricos > Unificações." />
      </View>

      {/* Resumo com o botão "+" para adicionar receita */}
      <View style={styles.resumo}>
        <View style={styles.resumoTopo}>
          <Text style={styles.resumoLabel}>
            Total ({receitas.length}{" "}
            {receitas.length === 1 ? "receita" : "receitas"})
          </Text>

          <TouchableOpacity
            onPress={adicionar}
            hitSlop={12}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.resumoValor}>{formatarReal(total)}</Text>
        <Text style={styles.resumoDetalhe}>
          Recebido: {formatarReal(totalRecebido)}
        </Text>
        <TouchableOpacity style={styles.botaoUnificar} onPress={unificar} activeOpacity={0.8}>
          <Ionicons name="git-compare-outline" size={18} color="#FFFFFF" />
          <Text style={styles.botaoUnificarTexto}>Unificar receitas a receber</Text>
        </TouchableOpacity>
      </View>

      {/* Filtros: todas, recebidas, a receber e vencidas */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtrosScroll}
        contentContainerStyle={styles.filtros}
      >
        {FILTROS.map((f) => {
          const ativo = filtro === f.chave;

          return (
            <TouchableOpacity
              key={f.chave}
              style={[styles.filtro, ativo && styles.filtroAtivo]}
              onPress={() => setFiltro(f.chave)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.filtroTexto, ativo && styles.filtroTextoAtivo]}
              >
                {f.rotulo} ({contagem[f.chave]})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Resultado do filtro (quantidade e soma) */}
      {filtro !== "todas" && (
        <Text style={styles.resultado}>
          {filtradas.length} {filtradas.length === 1 ? "receita" : "receitas"} ·{" "}
          {formatarReal(totalFiltrado)}
        </Text>
      )}

      <FlatList
        data={filtradas}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          carregando ? null : (
            <View style={styles.vazio}>
              <Ionicons name="cash-outline" size={48} color="#BBBBBB" />
              <Text style={styles.vazioTexto}>{MENSAGEM_VAZIO[filtro]}</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 20 },

  // Cabeçalho com seta de voltar
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  titulo: { fontSize: 28, fontWeight: "bold", color: "#1A1A1A" },

  // Resumo com o total
  resumo: {
    backgroundColor: "#00897B",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,

    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  resumoTopo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resumoLabel: { fontSize: 14, color: "#E0F2F1" },
  resumoValor: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 4,
  },
  resumoDetalhe: { fontSize: 13, color: "#E0F2F1", marginTop: 4 },
  botaoUnificar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#00796B", borderRadius: 10, paddingVertical: 11, marginTop: 14 },
  botaoUnificarTexto: { color: "#FFFFFF", fontSize: 14, fontWeight: "bold" },

  // Filtros
  filtrosScroll: { height: 52, flexGrow: 0, flexShrink: 0, marginBottom: 12 },
  filtros: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 2,
    paddingRight: 20,
  },
  filtro: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 14,
    minHeight: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  filtroAtivo: { backgroundColor: "#00897B", borderColor: "#00897B" },
  filtroTexto: {
    fontSize: 14,
    lineHeight: 20,
    includeFontPadding: false,
    textAlignVertical: "center",
    color: "#1A1A1A",
  },
  filtroTextoAtivo: { color: "#FFFFFF", fontWeight: "bold" },
  resultado: { fontSize: 13, color: "#666666", marginBottom: 10 },

  // Lista
  lista: { paddingBottom: 20, flexGrow: 1 },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardInfo: { flex: 1, marginRight: 12 },
  nome: { fontSize: 17, fontWeight: "bold", color: "#1A1A1A" },
  detalhe: { fontSize: 13, color: "#666666", marginTop: 4 },
  observacao: { fontSize: 12, color: "#999999", marginTop: 2 },
  status: { fontSize: 12, fontWeight: "bold", marginTop: 4 },
  statusRecebido: { color: "#2E7D32" },
  statusPendente: { color: "#F57C00" },
  statusVencida: { color: "#D32F2F" },
  cardDireita: { alignItems: "flex-end", gap: 10 },
  valor: { fontSize: 17, fontWeight: "bold", color: "#2E7D32" },
  botaoReceber: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#00897B",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  botaoReceberTexto: { color: "#FFFFFF", fontSize: 12, fontWeight: "bold" },

  // Lista vazia
  vazio: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  vazioTexto: { fontSize: 16, color: "#999999" },
});
