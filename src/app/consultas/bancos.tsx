import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { listarBancos, type Banco } from "../../database/dbGestor/dbBancos";

export default function Bancos() {
  const router = useRouter();
  const [bancos, setBancos] = useState<Banco[]>([]);
  const carregar = useCallback(async () => {
    try { setBancos(await listarBancos()); } catch (erro) { console.error(erro); }
  }, []);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}><Ionicons name="arrow-back" size={28} color="#1A1A1A" /></TouchableOpacity>
        <Text style={styles.titulo}>Bancos</Text>
        <TouchableOpacity onPress={() => router.push("/cadastros/cadBanco" as never)} accessibilityRole="button" accessibilityLabel="Cadastrar banco">
          <Ionicons name="add-circle-outline" size={29} color="#00897B" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={bancos}
        keyExtractor={(banco) => String(banco.id)}
        contentContainerStyle={styles.lista}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push({ pathname: "/cadastros/cadBanco", params: { id: String(item.id) } } as never)}>
            <View style={[styles.bolinha, { backgroundColor: item.cor }]} />
            <Text style={styles.nome}>{item.nome}</Text>
            <Ionicons name="chevron-forward" size={20} color="#777777" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={<View style={styles.vazio}><Ionicons name="business-outline" size={46} color="#BBBBBB"/><Text style={styles.vazioTitulo}>Nenhum banco cadastrado</Text><Text style={styles.vazioTexto}>Toque no + para cadastrar um banco e escolher sua cor.</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 20 },
  cabecalho: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 18 },
  titulo: { flex: 1, fontSize: 26, fontWeight: "bold", color: "#1A1A1A" },
  lista: { flexGrow: 1, paddingBottom: 24 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 15, marginBottom: 10, elevation: 2 },
  bolinha: { width: 28, height: 28, borderRadius: 14 },
  nome: { flex: 1, color: "#222222", fontSize: 16, fontWeight: "600" },
  vazio: { flex: 1, minHeight: 240, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 24 },
  vazioTitulo: { color: "#555555", fontSize: 17, fontWeight: "bold" },
  vazioTexto: { color: "#888888", fontSize: 14, textAlign: "center" },
});
