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
    type Saldo,
    excluirSaldo,
    listarSaldos,
} from "../../database/dbGestor/dbSaldos";
import { dataISOparaBR } from "../../utils/converterData";

type NomeIcone = keyof typeof Ionicons.glyphMap;

// Ícone e cor de cada tipo de saldo (os mesmos tipos do cadastro)
const ICONES: Record<string, { nome: NomeIcone; cor: string }> = {
  Salário: { nome: "cash-outline", cor: "#2E7D32" },
  "Renda extra": { nome: "add-circle-outline", cor: "#00897B" },
  Investimento: { nome: "trending-up-outline", cor: "#1976D2" },
  Outros: { nome: "ellipsis-horizontal-circle-outline", cor: "#757575" },
};

const ICONE_PADRAO = { nome: "wallet-outline" as NomeIcone, cor: "#757575" };

// Formata valores para Real brasileiro
const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ConSaldo() {
  const router = useRouter();
  const [saldos, setSaldos] = useState<Saldo[]>([]);
  const [carregando, setCarregando] = useState(true);

  const total = saldos.reduce((soma, s) => soma + s.valor, 0);

  const voltar = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/home/home");
    }
  };

  const carregar = useCallback(async () => {
    try {
      setSaldos(await listarSaldos());
    } catch (erro) {
      console.error(erro);
      Alert.alert("Erro", "Não foi possível carregar os saldos.");
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

  const confirmarExclusao = (saldo: Saldo) => {
    Alert.alert(
      "Excluir saldo",
      `Deseja excluir o saldo "${saldo.tipo}" de ${formatarMoeda(saldo.valor)}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await excluirSaldo(saldo.id);
              await carregar();
            } catch (erro) {
              console.error(erro);
              Alert.alert("Erro", "Não foi possível excluir o saldo.");
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Saldo }) => {
    const icone = ICONES[item.tipo] ?? ICONE_PADRAO;

    return (
      <View style={styles.card}>
        <View style={[styles.circulo, { backgroundColor: icone.cor }]}>
          <Ionicons name={icone.nome} size={24} color="#FFFFFF" />
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.tipo}>{item.tipo}</Text>
          <Text style={styles.detalhe}>
            Cadastrado em {dataISOparaBR(item.criado_em.slice(0, 10))}
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
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabeçalho com botão de voltar */}
      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={voltar} hitSlop={10} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={28} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Saldos</Text>
      </View>

      {/* Resumo */}
      <View style={styles.resumo}>
        <Text style={styles.resumoLabel}>
          Total ({saldos.length} {saldos.length === 1 ? "saldo" : "saldos"})
        </Text>
        <Text style={styles.resumoValor}>{formatarMoeda(total)}</Text>
      </View>

      <FlatList
        data={saldos}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          carregando ? null : (
            <View style={styles.vazio}>
              <Ionicons name="wallet-outline" size={48} color="#BBBBBB" />
              <Text style={styles.vazioTexto}>Nenhum saldo cadastrado</Text>
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
    backgroundColor: "#2E7D32",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,

    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  resumoLabel: { fontSize: 14, color: "#E8F5E9" },
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
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,

    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  circulo: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
  },
  cardInfo: { flex: 1 },
  tipo: { fontSize: 17, fontWeight: "bold", color: "#1A1A1A" },
  detalhe: { fontSize: 13, color: "#666666", marginTop: 4 },
  cardDireita: { alignItems: "flex-end", gap: 10 },
  valor: { fontSize: 17, fontWeight: "bold", color: "#2E7D32" },

  // Lista vazia
  vazio: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  vazioTexto: { fontSize: 16, color: "#999999" },
});