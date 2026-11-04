import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Banco } from "../database/dbGestor/dbBancos";

export function ModalSeletorBanco({
  bancos,
  visivel,
  valor,
  incluirNenhum = false,
  onFechar,
  onSelecionar,
}: {
  bancos: Banco[];
  visivel: boolean;
  valor: number | null;
  incluirNenhum?: boolean;
  onFechar: () => void;
  onSelecionar: (id: number | null) => void;
}) {
  const selecionar = (id: number | null) => {
    onSelecionar(id);
    onFechar();
  };

  return (
    <Modal visible={visivel} transparent animationType="fade" statusBarTranslucent onRequestClose={onFechar}>
      <View style={styles.fundo}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onFechar} />
        <View style={styles.caixa}>
          <Text style={styles.titulo}>Selecione o banco</Text>
          <ScrollView style={styles.lista} keyboardShouldPersistTaps="handled">
            {incluirNenhum && (
              <TouchableOpacity style={[styles.opcao, valor === null && styles.opcaoAtiva]} onPress={() => selecionar(null)}>
                <View style={[styles.bolinha, styles.bolinhaNenhum]} />
                <Text style={styles.nome}>Nenhum</Text>
                {valor === null && <Ionicons name="checkmark" size={20} color="#00897B" />}
              </TouchableOpacity>
            )}
            {bancos.map((banco) => (
              <TouchableOpacity key={banco.id} style={[styles.opcao, valor === banco.id && styles.opcaoAtiva]} onPress={() => selecionar(banco.id)}>
                <View style={[styles.bolinha, { backgroundColor: banco.cor }]} />
                <Text style={styles.nome}>{banco.nome}</Text>
                {valor === banco.id && <Ionicons name="checkmark" size={20} color="#00897B" />}
              </TouchableOpacity>
            ))}
            {bancos.length === 0 && <Text style={styles.vazio}>Nenhum banco cadastrado</Text>}
          </ScrollView>
          <TouchableOpacity style={styles.cancelar} onPress={onFechar}><Text style={styles.cancelarTexto}>Cancelar</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function SeletorBanco({
  bancos,
  valor,
  onChange,
  disabled = false,
  incluirNenhum = false,
  placeholder = "Selecione um banco",
}: {
  bancos: Banco[];
  valor: number | null;
  onChange: (id: number | null) => void;
  disabled?: boolean;
  incluirNenhum?: boolean;
  placeholder?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const selecionado = bancos.find((banco) => banco.id === valor);
  const rotulo = selecionado?.nome ?? (incluirNenhum && valor === null ? "Nenhum" : placeholder);

  return (
    <>
      <TouchableOpacity style={[styles.seletor, disabled && styles.seletorDesabilitado]} onPress={() => !disabled && setAberto(true)} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }}>
        <View style={styles.valorSelecionado}>
          {selecionado && <View style={[styles.bolinha, { backgroundColor: selecionado.cor }]} />}
          <Text style={[styles.textoSeletor, !selecionado && !(incluirNenhum && valor === null) && styles.placeholder]} numberOfLines={1}>{rotulo}</Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={disabled ? "#AAAAAA" : "#666666"} />
      </TouchableOpacity>
      <ModalSeletorBanco bancos={bancos} visivel={aberto} valor={valor} incluirNenhum={incluirNenhum} onFechar={() => setAberto(false)} onSelecionar={onChange} />
    </>
  );
}

const styles = StyleSheet.create({
  seletor: { minHeight: 48, backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  seletorDesabilitado: { backgroundColor: "#EEEEEE" },
  valorSelecionado: { flex: 1, flexDirection: "row", alignItems: "center", gap: 9 },
  textoSeletor: { color: "#1A1A1A", fontSize: 16 },
  placeholder: { color: "#999999" },
  fundo: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: 24 },
  caixa: { maxHeight: "75%", backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, elevation: 10 },
  titulo: { fontSize: 18, fontWeight: "bold", color: "#1A1A1A", marginBottom: 8 },
  lista: { flexGrow: 0 },
  opcao: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E5E5E5" },
  opcaoAtiva: { backgroundColor: "#E8F5F2" },
  bolinha: { width: 20, height: 20, borderRadius: 10 },
  bolinhaNenhum: { backgroundColor: "#BDBDBD" },
  nome: { flex: 1, color: "#222222", fontSize: 16 },
  vazio: { color: "#777777", paddingVertical: 18, textAlign: "center" },
  cancelar: { alignSelf: "flex-end", marginTop: 10, paddingHorizontal: 12, paddingVertical: 8 },
  cancelarTexto: { color: "#00897B", fontSize: 15, fontWeight: "bold" },
});
