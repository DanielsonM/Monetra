import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InfoButton from "../../components/infoButton";
import { buscarAplicacao, sacarAplicacao, type Aplicacao } from "../../database/dbGestor/dbAplicacoes";

const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const mascaraMoeda = (texto: string) => {
  const digitos = texto.replace(/\D/g, "").replace(/^0+/, "");
  if (!digitos) return "";
  const preenchido = digitos.padStart(3, "0");
  const inteiros = preenchido.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${inteiros},${preenchido.slice(-2)}`;
};
const moedaParaNumero = (texto: string) => Number(texto.replace(/\./g, "").replace(",", "."));

export default function SacarAplicacao() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const aplicacaoId = Number(id);
  const [aplicacao, setAplicacao] = useState<Aplicacao | null>(null);
  const [valor, setValor] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let ativo = true;
    if (!Number.isInteger(aplicacaoId) || aplicacaoId <= 0) {
      Alert.alert("Erro", "Aplicação inválida.");
      router.back();
      return;
    }
    buscarAplicacao(aplicacaoId).then((registro) => {
      if (ativo) setAplicacao(registro);
    }).catch((erro) => {
      console.error(erro);
      Alert.alert("Erro", "Não foi possível carregar a aplicação.");
    });
    return () => { ativo = false; };
  }, [aplicacaoId, router]);

  const confirmarSaque = () => {
    const valorNumero = moedaParaNumero(valor);
    if (!aplicacao || !Number.isFinite(valorNumero) || valorNumero <= 0) {
      Alert.alert("Atenção", "Informe um valor de saque maior que zero.");
      return;
    }
    if (valorNumero > aplicacao.valor) {
      Alert.alert("Atenção", "O valor do saque não pode ultrapassar o saldo da aplicação.");
      return;
    }

    Alert.alert("Confirmar saque", `Sacar ${moeda(valorNumero)} de ${aplicacao.banco}? Esse valor será subtraído da aplicação e cadastrado como receita recebida.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Sacar", onPress: () => {
        void (async () => {
          try {
            setSalvando(true);
            await sacarAplicacao(aplicacao.id, valorNumero);
            Alert.alert("Saque realizado", "O valor foi retirado da aplicação e registrado nas receitas como recebido.");
            router.back();
          } catch (erro) {
            console.error(erro);
            Alert.alert("Erro", erro instanceof Error ? erro.message : "Não foi possível realizar o saque.");
          } finally {
            setSalvando(false);
          }
        })();
      } },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}><Ionicons name="arrow-back" size={28} color="#1A1A1A" /></TouchableOpacity>
        <Text style={styles.titulo}>Sacar aplicação</Text>
        <InfoButton compacto titulo="Saque de aplicação" texto="O valor informado será descontado do saldo aplicado e criado como uma receita recebida, do tipo Saque de aplicação." />
      </View>
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        {aplicacao && <View style={styles.resumo}>
          <Text style={styles.rotulo}>Aplicação</Text>
          <Text style={styles.banco}>{aplicacao.banco}</Text>
          <Text style={styles.rotuloSaldo}>Saldo disponível para saque</Text>
          <Text style={styles.saldo}>{moeda(aplicacao.valor)}</Text>
        </View>}
        <Text style={styles.label}>Valor do saque *</Text>
        <TextInput style={styles.input} placeholder="0,00" keyboardType="number-pad" value={valor} onChangeText={(texto) => setValor(mascaraMoeda(texto))} />
        <Text style={styles.ajuda}>Será criada uma receita recebida do tipo “Saque de aplicação”.</Text>
        <TouchableOpacity style={[styles.botao, salvando && styles.botaoDesabilitado]} onPress={confirmarSaque} disabled={salvando || !aplicacao}>
          <Text style={styles.botaoTexto}>{salvando ? "Processando..." : "Confirmar saque"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 20 },
  cabecalho: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  titulo: { flex: 1, fontSize: 24, fontWeight: "bold", color: "#1A1A1A" },
  conteudo: { paddingBottom: 30 },
  resumo: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 18, marginBottom: 20, elevation: 2 },
  rotulo: { fontSize: 14, color: "#666666" },
  banco: { fontSize: 20, fontWeight: "bold", color: "#1A1A1A", marginTop: 4 },
  rotuloSaldo: { fontSize: 14, color: "#666666", marginTop: 14 },
  saldo: { fontSize: 24, fontWeight: "bold", color: "#1565C0", marginTop: 3 },
  label: { fontSize: 16, fontWeight: "bold", color: "#333333", marginBottom: 8 },
  input: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DDDDDD", borderRadius: 10, padding: 14, fontSize: 18, color: "#222222" },
  ajuda: { fontSize: 13, color: "#666666", marginTop: 8 },
  botao: { backgroundColor: "#00897B", borderRadius: 12, alignItems: "center", padding: 15, marginTop: 24 },
  botaoDesabilitado: { opacity: 0.5 },
  botaoTexto: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
});
