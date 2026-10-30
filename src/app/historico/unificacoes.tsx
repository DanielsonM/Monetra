import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { listarUnificacoes, type UnificacaoHistorico } from "../../database/dbGestor/dbHistorico";

const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (data: string) => {
  const [ano, mes, dia] = data.slice(0, 10).split("-");
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : data;
};

export default function HistoricoUnificacoes() {
  const router = useRouter();
  const [unificacoes, setUnificacoes] = useState<UnificacaoHistorico[]>([]);
  const [carregando, setCarregando] = useState(true);

  useFocusEffect(useCallback(() => {
    let ativo = true;
    setCarregando(true);
    listarUnificacoes().then((dados) => {
      if (ativo) setUnificacoes(dados);
    }).catch((erro) => console.error(erro)).finally(() => {
      if (ativo) setCarregando(false);
    });
    return () => { ativo = false; };
  }, []));

  const voltar = () => router.canGoBack() ? router.back() : router.replace("/home/home");

  return <SafeAreaView style={s.container}>
    <View style={s.header}>
      <TouchableOpacity onPress={voltar} hitSlop={10}><Ionicons name="arrow-back" size={28} color="#1A1A1A" /></TouchableOpacity>
      <Text style={s.titulo}>Histórico de unificações</Text>
    </View>
    <Text style={s.intro}>Veja qual lançamento foi somado e em qual lançamento o valor ficou.</Text>
    <ScrollView contentContainerStyle={s.lista}>
      {!carregando && unificacoes.length === 0 ? <View style={s.vazio}><Ionicons name="git-compare-outline" size={42} color="#BBBBBB" /><Text style={s.vazioTexto}>Nenhuma unificação registrada.</Text></View> : unificacoes.map((item) => (
        <View key={item.id} style={s.card}>
          <View style={s.topo}><View style={[s.icone, { backgroundColor: item.natureza === "Receita" ? "#E8F5E9" : "#FFEBEE" }]}><Ionicons name={item.natureza === "Receita" ? "cash-outline" : "receipt-outline"} size={20} color={item.natureza === "Receita" ? "#2E7D32" : "#D32F2F"} /></View><View style={s.topoTexto}><Text style={s.natureza}>{item.natureza} · {dataBR(item.data_unificacao)}</Text><Text style={s.total}>{moeda(item.valor_unificado)}</Text></View></View>
          <View style={s.detalheBox}><Text style={s.rotulo}>Somado</Text><Text style={s.nome}>{item.nome_origem}</Text><Text style={s.valor}>{moeda(item.valor_origem)}</Text></View>
          <View style={s.seta}><Ionicons name="arrow-down" size={18} color="#00897B" /></View>
          <View style={s.detalheBox}><Text style={s.rotulo}>Unificado em</Text><Text style={s.nome}>{item.nome_destino}</Text><Text style={s.valor}>{moeda(item.valor_destino)} + {moeda(item.valor_origem)} = {moeda(item.valor_unificado)}</Text></View>
        </View>
      ))}
    </ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({ container: { flex: 1, backgroundColor: "#F5F5F5", padding: 20 }, header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }, titulo: { flex: 1, fontSize: 23, fontWeight: "bold", color: "#1A1A1A" }, intro: { color: "#666", marginBottom: 14 }, lista: { paddingBottom: 24, flexGrow: 1 }, card: { backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2 }, topo: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }, icone: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" }, topoTexto: { flex: 1 }, natureza: { color: "#666", fontSize: 12 }, total: { color: "#00897B", fontWeight: "bold", fontSize: 18, marginTop: 2 }, detalheBox: { backgroundColor: "#F7F8F8", borderRadius: 10, padding: 12 }, rotulo: { color: "#777", fontSize: 12, marginBottom: 3 }, nome: { color: "#222", fontSize: 15, fontWeight: "bold" }, valor: { color: "#555", fontSize: 13, marginTop: 3 }, seta: { alignItems: "center", paddingVertical: 5 }, vazio: { alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 70 }, vazioTexto: { color: "#888" } });
