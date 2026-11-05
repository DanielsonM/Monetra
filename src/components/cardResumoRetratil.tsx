import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState, type ReactNode } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View } from "react-native";

export default function CardResumoRetratil({ children }: { children: ReactNode }) {
  const [recolhido, setRecolhido] = useState(false);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_evento, gesto) => Math.abs(gesto.dy) > 12 && Math.abs(gesto.dy) > Math.abs(gesto.dx),
    onPanResponderRelease: (_evento, gesto) => {
      if (gesto.dy < -35) setRecolhido(true);
      else if (gesto.dy > 35) setRecolhido(false);
    },
  }), []);

  return <View>
    {!recolhido && children}
    <Pressable
      {...panResponder.panHandlers}
      onPress={() => setRecolhido((atual) => !atual)}
      style={[styles.alca, recolhido && styles.alcaRecolhida]}
      accessibilityRole="button"
      accessibilityLabel={recolhido ? "Mostrar resumo; arraste para baixo" : "Recolher resumo; arraste para cima"}
      accessibilityHint="Também é possível tocar para alternar a exibição do resumo."
    >
      <Ionicons name={recolhido ? "chevron-down" : "chevron-up"} size={15} color={recolhido ? "#FFFFFF" : "#00796B"} />
      {recolhido && <Text style={styles.textoAlca}>Mostrar resumo</Text>}
      {!recolhido && <View style={styles.traco} />}
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  alca: { minHeight: 30, marginTop: -14, marginBottom: 12, alignSelf: "center", paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 18, backgroundColor: "#E0F2F1", elevation: 1 },
  alcaRecolhida: { alignSelf: "stretch", minHeight: 38, marginTop: 0, backgroundColor: "#00897B", elevation: 2 },
  textoAlca: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  traco: { width: 38, height: 3, borderRadius: 2, backgroundColor: "#80CBC4" },
});
