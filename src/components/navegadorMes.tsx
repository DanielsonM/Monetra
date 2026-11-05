import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { PanResponder, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const NOMES_MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export const chaveMesAtual = (data = new Date()) => `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;

const deslocarMes = (chave: string, quantidade: number) => {
  const [ano, mes] = chave.split("-").map(Number);
  const data = new Date(ano, mes - 1 + quantidade, 1);
  return chaveMesAtual(data);
};

export default function NavegadorMes({ mes, onChange }: { mes: string; onChange: (novoMes: string) => void }) {
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_evento, gesto) => Math.abs(gesto.dx) > 18 && Math.abs(gesto.dx) > Math.abs(gesto.dy) * 1.2,
    onPanResponderRelease: (_evento, gesto) => {
      if (gesto.dx <= -45) onChange(deslocarMes(mes, 1));
      else if (gesto.dx >= 45) onChange(deslocarMes(mes, -1));
    },
  }), [mes, onChange]);
  const [ano, numeroMes] = mes.split("-").map(Number);

  return <View style={styles.container}>
    <TouchableOpacity style={styles.seta} onPress={() => onChange(deslocarMes(mes, -1))} accessibilityRole="button" accessibilityLabel="Mês anterior">
      <Ionicons name="chevron-back" size={21} color="#FFFFFF" />
    </TouchableOpacity>
    <View style={styles.mes} {...panResponder.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel={`${NOMES_MESES[numeroMes - 1]} de ${ano}. Deslize para mudar o mês.`}>
      <Text style={styles.rotulo}>{NOMES_MESES[numeroMes - 1]} {ano}</Text>
      <Text style={styles.dica}>Deslize para mudar o mês</Text>
    </View>
    <TouchableOpacity style={styles.seta} onPress={() => onChange(deslocarMes(mes, 1))} accessibilityRole="button" accessibilityLabel="Próximo mês">
      <Ionicons name="chevron-forward" size={21} color="#FFFFFF" />
    </TouchableOpacity>
  </View>;
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  seta: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  mes: { flex: 1, alignItems: "center", paddingVertical: 4 },
  rotulo: { color: "#FFFFFF", fontSize: 15, fontWeight: "bold" },
  dica: { color: "#FFFFFF", opacity: 0.78, fontSize: 10, marginTop: 1 },
});
