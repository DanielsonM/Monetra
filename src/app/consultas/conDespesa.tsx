import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  type Despesa,
  excluirDespesa,
  listarDespesas,
} from "../../database/dbGestor/dbDespesas";
import { dataISOparaBR } from "../../utils/converterData";
import InfoButton from "../../components/infoButton";

// Formata valores para Real brasileiro
const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ConDespesa() {
  const router = useRouter();
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [buscarNome, setBuscarNome] = useState(true);
  const [buscarTipo, setBuscarTipo] = useState(false);
  const [tipoSelecionado, setTipoSelecionado] = useState("Todos");
  const [tiposAbertos, setTiposAbertos] = useState(false);

  const tiposDisponiveis = [
    "Todos",
    ...Array.from(new Set(despesas.map((despesa) => despesa.tipo))).sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    ),
  ];
  const despesasFiltradas = despesas.filter((d) => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    const nomeCorresponde = !buscarNome || !termo || d.nome.toLocaleLowerCase("pt-BR").includes(termo);
    const tipoCorresponde = !buscarTipo || tipoSelecionado === "Todos" || d.tipo === tipoSelecionado;
    return nomeCorresponde && tipoCorresponde;
  });
  const placeholderBusca = buscarNome && buscarTipo
    ? "Buscar por nome ou tipo"
    : buscarNome
      ? "Buscar por nome"
      : buscarTipo
        ? "Selecione um tipo"
        : "Busca desativada";

  const total = despesasFiltradas.reduce((soma, d) => soma + d.valor, 0);
  const pesquisaAtiva = (buscarNome && Boolean(busca.trim())) || (buscarTipo && tipoSelecionado !== "Todos");

  const voltar = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/home/home");
    }
  };

  // Abre o cadastro vazio, para uma nova despesa
  const adicionar = () => {
    router.push("/cadastros/cadDespesas" as never);
  };

  const unificar = () => {
    router.push("/consultas/unificarDespesas" as never);
  };

  // Abre o cadastro em modo edição, com os dados da despesa carregados
  const editar = (despesa: Despesa) => {
    router.push({
      pathname: "/cadastros/cadDespesas",
      params: { id: String(despesa.id) },
    } as never);
  };

  const carregar = useCallback(async () => {
    try {
      setDespesas(await listarDespesas());
    } catch (erro) {
      console.error(erro);
      Alert.alert("Erro", "Não foi possível carregar as despesas.");
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

  const confirmarExclusao = (despesa: Despesa) => {
    Alert.alert(
      "Excluir despesa",
      `Deseja excluir "${despesa.nome}" (${formatarMoeda(despesa.valor)})?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await excluirDespesa(despesa.id);
              await carregar();
            } catch (erro) {
              console.error(erro);
              Alert.alert("Erro", "Não foi possível excluir a despesa.");
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Despesa }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => editar(item)}
    >
      <View style={styles.cardInfo}>
        <Text style={styles.nome}>{item.nome}</Text>
        <Text style={styles.detalhe}>
          {item.tipo} · Vence em {dataISOparaBR(item.vencimento)}
        </Text>
      </View>

      <View style={styles.cardDireita}>
        <Text style={styles.valor}>{formatarMoeda(item.valor)}</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabeçalho com botão de voltar */}
      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={voltar} hitSlop={10} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={28} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Despesas</Text>
        <InfoButton compacto titulo="Consulta de despesas" texto="Veja as despesas cadastradas, seus vencimentos e status de pagamento. O botão + cria uma nova despesa; o pagamento pode ser confirmado na lista ou na Provisão. Em Unificar despesas não pagas, escolha a despesa que continuará e a que será somada. A operação fica em Históricos > Unificações." />
      </View>

      {/* Resumo com o botão "+" para adicionar despesa */}
      <View style={styles.resumo}>
        <View style={styles.resumoTopo}>
          <Text style={styles.resumoLabel}>
            Total ({despesasFiltradas.length}{" "}
            {despesasFiltradas.length === 1 ? "despesa" : "despesas"})
          </Text>

          <TouchableOpacity
            onPress={adicionar}
            hitSlop={12}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.resumoValor}>{formatarMoeda(total)}</Text>
        <TouchableOpacity style={styles.botaoUnificar} onPress={unificar} activeOpacity={0.8}>
          <Ionicons name="git-compare-outline" size={18} color="#FFFFFF" />
          <Text style={styles.botaoUnificarTexto}>Unificar despesas não pagas</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.linhaBusca}>
        <TextInput style={[styles.busca, !buscarNome && styles.buscaDesativada]} value={busca} onChangeText={setBusca} placeholder={placeholderBusca} editable={buscarNome} returnKeyType="search" accessibilityLabel={placeholderBusca} />
        {pesquisaAtiva && <View style={styles.somaBusca} accessibilityLabel={`Soma dos resultados: ${formatarMoeda(total)}`}><Text style={styles.somaBuscaLabel}>Soma</Text><Text style={styles.somaBuscaValor} numberOfLines={1} adjustsFontSizeToFit>{formatarMoeda(total)}</Text></View>}
      </View>
      <View style={styles.opcoesBusca}>
        <View style={styles.opcaoBusca}><Text style={styles.opcaoBuscaTexto}>Nome</Text><Switch value={buscarNome} onValueChange={(ativo) => { setBuscarNome(ativo); if (ativo) { setBuscarTipo(false); setTiposAbertos(false); } setBusca(""); }} trackColor={{ false: "#D0D0D0", true: "#80CBC4" }} thumbColor={buscarNome ? "#00897B" : "#F4F4F4"} accessibilityLabel="Buscar por nome" /></View>
        <View style={styles.opcaoBusca}><Text style={styles.opcaoBuscaTexto}>Tipo</Text><Switch value={buscarTipo} onValueChange={(ativo) => { setBuscarTipo(ativo); if (ativo) { setBuscarNome(false); setTipoSelecionado("Todos"); } setBusca(""); setTiposAbertos(false); }} trackColor={{ false: "#D0D0D0", true: "#80CBC4" }} thumbColor={buscarTipo ? "#00897B" : "#F4F4F4"} accessibilityLabel="Buscar por tipo" /></View>
      </View>
      {buscarTipo && <View style={styles.seletorTipoContainer}>
        <TouchableOpacity style={styles.seletorTipo} onPress={() => setTiposAbertos((aberto) => !aberto)} accessibilityRole="button" accessibilityLabel={`Tipo selecionado: ${tipoSelecionado}`} accessibilityState={{ expanded: tiposAbertos }}>
          <Text style={styles.seletorTipoTexto} numberOfLines={1}>{tipoSelecionado}</Text>
          <Ionicons name={tiposAbertos ? "chevron-up" : "chevron-down"} size={18} color="#00897B" />
        </TouchableOpacity>
        {tiposAbertos && <ScrollView style={styles.listaTipos} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {tiposDisponiveis.map((tipo) => <TouchableOpacity key={tipo} style={[styles.opcaoTipo, tipoSelecionado === tipo && styles.opcaoTipoAtiva]} onPress={() => { setTipoSelecionado(tipo); setTiposAbertos(false); }} accessibilityRole="button" accessibilityState={{ selected: tipoSelecionado === tipo }}>
            <Text style={[styles.opcaoTipoTexto, tipoSelecionado === tipo && styles.opcaoTipoTextoAtiva]}>{tipo}</Text>
          </TouchableOpacity>)}
        </ScrollView>}
      </View>}

      <FlatList
        data={despesasFiltradas}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          carregando ? null : (
            <View style={styles.vazio}>
              <Ionicons name="receipt-outline" size={48} color="#BBBBBB" />
              <Text style={styles.vazioTexto}>{busca.trim() || (buscarTipo && tipoSelecionado !== "Todos") ? "Nenhuma despesa encontrada" : "Nenhuma despesa cadastrada"}</Text>
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
  linhaBusca: { flexDirection: "row", alignItems: "stretch", gap: 8, marginBottom: 12 },
  busca: { flex: 1, minWidth: 0, backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: "#1A1A1A" },
  buscaDesativada: { color: "#888888" },
  somaBusca: { width: 124, justifyContent: "center", backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 10, borderWidth: 1, borderColor: "#E0E0E0" },
  somaBuscaLabel: { fontSize: 11, color: "#777777" },
  somaBuscaValor: { fontSize: 13, fontWeight: "bold", color: "#1A1A1A", marginTop: 2 },
  opcoesBusca: { flexDirection: "row", gap: 12, marginBottom: 12 },
  opcaoBusca: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  opcaoBuscaTexto: { fontSize: 14, color: "#1A1A1A" },
  seletorTipoContainer: { marginBottom: 12, zIndex: 2 },
  seletorTipo: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: "#D7E8E4" },
  seletorTipoTexto: { flex: 1, color: "#1A1A1A", fontSize: 15 },
  listaTipos: { maxHeight: 180, backgroundColor: "#FFFFFF", borderRadius: 12, marginTop: 4, borderWidth: 1, borderColor: "#E0E0E0", elevation: 4 },
  opcaoTipo: { minHeight: 44, justifyContent: "center", paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#EEEEEE" },
  opcaoTipoAtiva: { backgroundColor: "#E8F5F2" },
  opcaoTipoTexto: { fontSize: 14, color: "#333333" },
  opcaoTipoTextoAtiva: { color: "#00796B", fontWeight: "bold" },

  // Resumo com o total
  resumo: {
    backgroundColor: "#D32F2F",
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
  resumoLabel: { fontSize: 14, color: "#FFEBEE" },
  resumoValor: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 4,
  },
  botaoUnificar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#B71C1C", borderRadius: 10, paddingVertical: 11, marginTop: 14 },
  botaoUnificarTexto: { color: "#FFFFFF", fontSize: 14, fontWeight: "bold" },

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
  cardDireita: { alignItems: "flex-end", gap: 10 },
  valor: { fontSize: 17, fontWeight: "bold", color: "#1A1A1A" },

  // Lista vazia
  vazio: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  vazioTexto: { fontSize: 16, color: "#999999" },
});
