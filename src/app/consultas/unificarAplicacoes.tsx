import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InfoButton from "../../components/infoButton";
import { listarAplicacoes, type Aplicacao, unificarAplicacoes } from "../../database/dbGestor/dbAplicacoes";

const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function UnificarAplicacoes() {
  const router = useRouter();
  const [aplicacoes, setAplicacoes] = useState<Aplicacao[]>([]);
  const [destinoId, setDestinoId] = useState<number | null>(null);
  const [origemId, setOrigemId] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    setAplicacoes(await listarAplicacoes());
    setDestinoId(null);
    setOrigemId(null);
  }, []);
  useFocusEffect(useCallback(() => { void carregar().catch(console.error); }, [carregar]));

  const destino = aplicacoes.find((aplicacao) => aplicacao.id === destinoId);
  const origem = aplicacoes.find((aplicacao) => aplicacao.id === origemId);

  const confirmar = () => {
    if (!destino || !origem) return;
    Alert.alert("Confirmar unificação", `Somar ${moeda(origem.valor)} de “${origem.banco}” em “${destino.banco}”? A aplicação de origem será apagada.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Unificar", onPress: () => {
        void (async () => {
          try {
            await unificarAplicacoes(origem.id, destino.id);
            await carregar();
            Alert.alert("Pronto", "Aplicações unificadas com sucesso.");
          } catch (erro) {
            Alert.alert("Erro", erro instanceof Error ? erro.message : "Não foi possível unificar as aplicações.");
          }
        })();
      } },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}><Ionicons name="arrow-back" size={28} color="#1A1A1A" /></TouchableOpacity>
        <Text style={styles.titulo}>Unificar aplicações</Text>
        <InfoButton compacto titulo="Unificar aplicações" texto="Escolha a aplicação que continuará e depois selecione a que será somada. O saldo é transferido para a aplicação de destino, a origem é apagada e a operação fica em Históricos > Unificações." />
      </View>
      <Text style={styles.instrucao}>Escolha a aplicação que continuará com o valor total:</Text>
      <ScrollView contentContainerStyle={styles.lista}>
        {aplicacoes.length === 0 ? <Text style={styles.vazio}>Não há aplicações para unificar.</Text> : aplicacoes.map((aplicacao) => (
          <View key={aplicacao.id} style={[styles.card, destinoId === aplicacao.id && styles.selecionado]}>
            <TouchableOpacity style={styles.linha} onPress={() => { setDestinoId(aplicacao.id); setOrigemId(null); }}>
              <Text style={styles.nome}>{aplicacao.banco}</Text><Text style={styles.valor}>{moeda(aplicacao.valor)}</Text>
            </TouchableOpacity>
            {destinoId === aplicacao.id && (
              <View style={styles.origemBox}>
                <Text style={styles.rotuloOrigem}>Agora escolha a aplicação que será somada:</Text>
                {aplicacoes.filter((item) => item.id !== aplicacao.id).map((item) => (
                  <TouchableOpacity key={item.id} style={styles.origemLinha} onPress={() => setOrigemId(item.id)}>
                    <Ionicons name={origemId === item.id ? "radio-button-on" : "radio-button-off"} size={20} color="#00897B" />
                    <Text style={styles.origemNome}>{item.banco} · {moeda(item.valor)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
      <TouchableOpacity style={[styles.botao, (!destino || !origem) && styles.botaoDesativado]} disabled={!destino || !origem} onPress={confirmar}>
        <Text style={styles.botaoTexto}>Unificar aplicações</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 20 },
  cabecalho: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  titulo: { flex: 1, fontSize: 23, fontWeight: "bold", color: "#1A1A1A" },
  instrucao: { color: "#555555", marginBottom: 10 },
  lista: { paddingBottom: 12 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: "transparent" },
  selecionado: { borderColor: "#00897B" },
  linha: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  nome: { flex: 1, color: "#222222", fontSize: 16, fontWeight: "bold" },
  valor: { color: "#1565C0", fontWeight: "bold" },
  origemBox: { borderTopWidth: 1, borderTopColor: "#EEEEEE", marginTop: 12, paddingTop: 10 },
  rotuloOrigem: { color: "#555555", marginBottom: 8, fontSize: 13 },
  origemLinha: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  origemNome: { color: "#333333", flex: 1 },
  vazio: { textAlign: "center", marginTop: 40, color: "#888888" },
  botao: { backgroundColor: "#00897B", borderRadius: 12, alignItems: "center", padding: 15, marginTop: 10 },
  botaoDesativado: { opacity: 0.45 },
  botaoTexto: { color: "#FFFFFF", fontWeight: "bold" },
});
