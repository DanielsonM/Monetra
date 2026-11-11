import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type CardParcelamentoProps = {
  nome: string;
  tipo: string;
  total: number;
  quantidade: number;
  pagas: number;
  aberto: boolean;
  onPress: () => void;
  onDelete?: () => void;
  natureza: "despesa" | "receita";
  children: ReactNode;
};

const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CardParcelamento({
  nome,
  tipo,
  total,
  quantidade,
  pagas,
  aberto,
  onPress,
  onDelete,
  natureza,
  children,
}: CardParcelamentoProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cabecalho}>
        <TouchableOpacity
          style={styles.expandir}
          onPress={onPress}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityState={{ expanded: aberto }}
          accessibilityLabel={`${nome}, ${quantidade} parcelas, ${pagas} pagas. ${aberto ? "Fechar" : "Abrir"} parcelas`}
        >
          <View style={styles.info}>
            <Text style={styles.nome} numberOfLines={1}>{nome}</Text>
            <Text style={styles.tipo} numberOfLines={1}>{tipo}</Text>
            <Text style={styles.progresso}>
              {pagas} de {quantidade} parcelas {natureza === "despesa" ? "pagas" : "recebidas"}
            </Text>
          </View>
          <View style={styles.direita}>
            <Text style={styles.total}>{formatarMoeda(total)}</Text>
            <Ionicons name={aberto ? "chevron-up" : "chevron-down"} size={22} color="#666666" />
          </View>
        </TouchableOpacity>
        {onDelete && (
          <TouchableOpacity
            style={styles.botaoExcluir}
            onPress={onDelete}
            hitSlop={8}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Excluir todas as parcelas de ${nome}`}
          >
            <Ionicons name="trash-outline" size={21} color="#D32F2F" />
          </TouchableOpacity>
        )}
      </View>
      {aberto && <View style={styles.parcelas}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cabecalho: { minHeight: 82, flexDirection: "row", alignItems: "center", paddingLeft: 16, paddingRight: 12, gap: 8 },
  expandir: { flex: 1, minHeight: 82, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  botaoExcluir: { width: 40, height: 44, alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  nome: { fontSize: 16, fontWeight: "bold", color: "#1A1A1A" },
  tipo: { fontSize: 12, color: "#666666", marginTop: 3 },
  progresso: { fontSize: 12, fontWeight: "600", color: "#00897B", marginTop: 6 },
  direita: { alignItems: "flex-end", gap: 8 },
  total: { fontSize: 17, fontWeight: "bold", color: "#1A1A1A" },
  parcelas: { paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E8E8E8" },
});
