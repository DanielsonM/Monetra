import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  titulo: string;
  texto: string;
  compacto?: boolean;
};

export default function InfoButton({ titulo, texto, compacto = false }: Props) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.botao, compacto && styles.botaoCompacto]}
        onPress={() => setAberto(true)}
        hitSlop={10}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Ajuda: ${titulo}`}
      >
        <Ionicons name="information-circle-outline" size={compacto ? 22 : 26} color="#10B981" />
      </TouchableOpacity>

      <Modal
        visible={aberto}
        transparent
        animationType="fade"
        onRequestClose={() => setAberto(false)}
      >
        <View style={styles.fundo}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setAberto(false)}
            accessibilityLabel="Fechar ajuda"
          />
          <View style={styles.caixa}>
            <View style={styles.cabecalho}>
              <View style={styles.tituloLinha}>
                <Ionicons name="help-circle" size={24} color="#10B981" />
                <Text style={styles.titulo}>{titulo}</Text>
              </View>
              <TouchableOpacity onPress={() => setAberto(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.conteudo}>
              <Text style={styles.texto}>{texto}</Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.fechar}
              onPress={() => setAberto(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.fecharTexto}>Entendi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  botao: { padding: 4, alignSelf: "flex-start" },
  botaoCompacto: { padding: 0 },
  fundo: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  caixa: {
    maxHeight: "75%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    elevation: 8,
  },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  tituloLinha: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  titulo: { fontSize: 19, fontWeight: "bold", color: "#1A1A1A", flexShrink: 1 },
  conteudo: { flexShrink: 1 },
  texto: { fontSize: 15, lineHeight: 23, color: "#555555" },
  fechar: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 18,
  },
  fecharTexto: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
});
