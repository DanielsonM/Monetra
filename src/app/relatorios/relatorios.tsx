import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const opcoes = [
  {
    titulo: "Histórico financeiro",
    descricao: "Resumo mensal de entradas, gastos e saques de aplicações",
    icone: "stats-chart-outline" as const,
    cor: "#00897B",
    rota: "/historico/historico",
  },
  {
    titulo: "Lançamentos financeiros",
    descricao: "Consulte e exporte receitas e despesas por mês",
    icone: "document-text-outline" as const,
    cor: "#1976D2",
    rota: "/relatorios/lancamentos",
  },
  {
    titulo: "Saques de aplicações",
    descricao: "Consulte movimentações e exporte o relatório de saques",
    icone: "cash-outline" as const,
    cor: "#1565C0",
    rota: "/relatorios/saquesAplicacoes",
  },
];

export default function Relatorios() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}><Ionicons name="arrow-back" size={26} color="#222222" /></TouchableOpacity>
        <Text style={styles.titulo}>Relatórios</Text>
      </View>
      <Text style={styles.intro}>Escolha o relatório que deseja consultar:</Text>
      {opcoes.map((opcao) => (
        <TouchableOpacity key={opcao.rota} style={styles.card} activeOpacity={0.8} onPress={() => router.push(opcao.rota as never)}>
          <View style={[styles.icone, { backgroundColor: opcao.cor }]}><Ionicons name={opcao.icone} size={22} color="#FFFFFF" /></View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitulo}>{opcao.titulo}</Text>
            <Text style={styles.cardDescricao}>{opcao.descricao}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#666666" />
        </TouchableOpacity>
      ))}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 18 },
  cabecalho: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  titulo: { fontSize: 24, fontWeight: "bold", color: "#222222" },
  intro: { fontSize: 14, color: "#666666", marginBottom: 12 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, marginBottom: 11, elevation: 2 },
  icone: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1 },
  cardTitulo: { color: "#222222", fontSize: 15, fontWeight: "bold" },
  cardDescricao: { color: "#777777", fontSize: 12, marginTop: 3 },
});
