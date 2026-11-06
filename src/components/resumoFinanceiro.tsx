import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const atalhos = [
  { titulo: "Consultar receitas", rota: "/consultas/conReceitas", cor: "#00897B", icone: "trending-up-outline" as const },
  { titulo: "Consultar despesas", rota: "/consultas/conDespesa", cor: "#D32F2F", icone: "trending-down-outline" as const },
];

export default function ResumoFinanceiro() {
  return (
    <View style={styles.container}>
      {atalhos.map((atalho) => (
        <TouchableOpacity
          key={atalho.rota}
          style={styles.card}
          activeOpacity={0.75}
          onPress={() => router.push(atalho.rota as never)}
        >
          <Ionicons name={atalho.icone} size={22} color={atalho.cor} />
          <Text style={styles.texto}>{atalho.titulo}</Text>
          <Ionicons name="chevron-forward" size={18} color="#777777" />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", gap: 10, marginBottom: 15 },
  card: {
    flex: 1,
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  texto: { flex: 1, fontSize: 13, fontWeight: "600", color: "#333333" },
});
