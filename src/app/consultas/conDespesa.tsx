import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
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

// Formata valores para Real brasileiro
const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ConDespesa() {
  const router = useRouter();
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [carregando, setCarregando] = useState(true);

  const total = despesas.reduce((soma, d) => soma + d.valor, 0);

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
      </View>

      {/* Resumo com o botão "+" para adicionar despesa */}
      <View style={styles.resumo}>
        <View style={styles.resumoTopo}>
          <Text style={styles.resumoLabel}>
            Total ({despesas.length}{" "}
            {despesas.length === 1 ? "despesa" : "despesas"})
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
      </View>

      <FlatList
        data={despesas}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          carregando ? null : (
            <View style={styles.vazio}>
              <Ionicons name="receipt-outline" size={48} color="#BBBBBB" />
              <Text style={styles.vazioTexto}>Nenhuma despesa cadastrada</Text>
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
