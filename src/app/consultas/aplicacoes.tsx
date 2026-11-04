import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InfoButton from "../../components/infoButton";
import { excluirAplicacao, listarAplicacoes, type Aplicacao } from "../../database/dbGestor/dbAplicacoes";

const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (data: string) => {
  const [ano, mes, dia] = data.slice(0, 10).split("-");
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : data;
};

export default function Aplicacoes() {
  const router = useRouter();
  const [aplicacoes, setAplicacoes] = useState<Aplicacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const total = aplicacoes.reduce((soma, aplicacao) => soma + aplicacao.valor, 0);

  const carregar = useCallback(async () => {
    try {
      setAplicacoes(await listarAplicacoes());
    } catch (erro) {
      console.error(erro);
      Alert.alert("Erro", "Não foi possível carregar as aplicações.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  const confirmarExclusao = (aplicacao: Aplicacao) => {
    Alert.alert("Apagar aplicação", `Deseja apagar a aplicação de ${moeda(aplicacao.valor)} no ${aplicacao.banco}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Apagar", style: "destructive", onPress: () => {
        void excluirAplicacao(aplicacao.id).then(carregar).catch((erro) => {
          console.error(erro);
          Alert.alert("Erro", "Não foi possível apagar a aplicação.");
        });
      } },
    ]);
  };

  const renderItem = ({ item }: { item: Aplicacao }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardTopo}>
          <TouchableOpacity style={styles.cardPrincipal} activeOpacity={0.8} onPress={() => router.push({ pathname: "/cadastros/cadAplicacao", params: { id: String(item.id) } } as never)}>
            <View style={[styles.icone, { backgroundColor: item.banco_cor || "#1565C0" }]}><Ionicons name="business-outline" size={23} color="#FFFFFF" /></View>
            <View style={styles.cardInfo}>
              <Text style={styles.banco} numberOfLines={1}>{item.banco}</Text>
              <Text style={styles.detalhe}>Cadastrada em {dataBR(item.criado_em)}</Text>
              {item.ultimo_saque_valor != null && item.ultimo_saque_data && <Text style={styles.detalheSaque}>Último saque: {moeda(item.ultimo_saque_valor)} · {dataBR(item.ultimo_saque_data)}</Text>}
            </View>
          </TouchableOpacity>
          <View style={styles.cardDireita}>
            <Text style={styles.valor}>{moeda(item.valor)}</Text>
            <TouchableOpacity onPress={() => confirmarExclusao(item)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Apagar aplicação de ${item.banco}`}>
              <Ionicons name="trash-outline" size={20} color="#D32F2F" />
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity style={styles.botaoCardSaque} onPress={() => router.push({ pathname: "/cadastros/sacarAplicacao", params: { id: String(item.id) } } as never)} activeOpacity={0.8}>
          <Ionicons name="cash-outline" size={17} color="#1565C0" />
          <Text style={styles.textoCardSaque}>Sacar</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace("/home/home")} hitSlop={10}>
          <Ionicons name="arrow-back" size={28} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Aplicações</Text>
        <InfoButton compacto titulo="Aplicações financeiras" texto="Consulte os valores que você mantém aplicados. Toque em um card para editar; use o ícone de lixeira para apagar ou Unificar para somar duas aplicações." />
      </View>

      <View style={styles.resumo}>
        <View style={styles.resumoTopo}>
          <Text style={styles.resumoLabel}>Total aplicado ({aplicacoes.length})</Text>
          <TouchableOpacity onPress={() => router.push("/cadastros/cadAplicacao" as never)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Adicionar aplicação">
            <Ionicons name="add-circle-outline" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.resumoValor}>{moeda(total)}</Text>
        <TouchableOpacity style={styles.botaoResumoUnificar} onPress={() => router.push("/consultas/unificarAplicacoes" as never)} activeOpacity={0.8} accessibilityRole="button">
          <Ionicons name="git-compare-outline" size={17} color="#FFFFFF" />
          <Text style={styles.textoResumoUnificar}>Unificar aplicações</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={aplicacoes}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={carregando ? null : (
          <View style={styles.vazio}>
            <Ionicons name="trending-up-outline" size={48} color="#BBBBBB" />
            <Text style={styles.vazioTexto}>Nenhuma aplicação cadastrada</Text>
            <Text style={styles.vazioAjuda}>Toque no botão + para adicionar a primeira.</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 20 },
  cabecalho: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  titulo: { flex: 1, fontSize: 26, fontWeight: "bold", color: "#1A1A1A" },
  resumo: { backgroundColor: "#1565C0", borderRadius: 20, padding: 20, marginBottom: 14, shadowColor: "#000000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 4 },
  resumoTopo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  resumoLabel: { fontSize: 14, color: "#E3F2FD" },
  resumoValor: { fontSize: 30, fontWeight: "bold", color: "#FFFFFF", marginTop: 4 },
  botaoResumoUnificar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 10, paddingVertical: 10, marginTop: 12 },
  textoResumoUnificar: { color: "#FFFFFF", fontSize: 14, fontWeight: "bold" },
  lista: { paddingBottom: 20, flexGrow: 1 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, marginBottom: 12, shadowColor: "#000000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardTopo: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardPrincipal: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  icone: { width: 46, height: 46, borderRadius: 23, justifyContent: "center", alignItems: "center", backgroundColor: "#1565C0" },
  cardInfo: { flex: 1, minWidth: 0 },
  banco: { fontSize: 17, fontWeight: "bold", color: "#1A1A1A" },
  detalhe: { fontSize: 12, color: "#666666", marginTop: 4 },
  detalheSaque: { fontSize: 12, color: "#1565C0", fontWeight: "600", marginTop: 4 },
  cardDireita: { alignItems: "flex-end", gap: 10 },
  botaoCardSaque: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-end", paddingVertical: 4 },
  textoCardSaque: { color: "#1565C0", fontSize: 13, fontWeight: "600" },
  valor: { fontSize: 16, fontWeight: "bold", color: "#1565C0" },
  vazio: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingBottom: 60 },
  vazioTexto: { fontSize: 16, color: "#777777", marginTop: 4 },
  vazioAjuda: { fontSize: 13, color: "#999999" },
});
