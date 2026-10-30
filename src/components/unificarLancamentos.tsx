import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InfoButton from "./infoButton";
import { type Despesa, listarDespesas, unificarDespesas } from "../database/dbGestor/dbDespesas";
import { type Receita, listarReceitas, unificarReceitas } from "../database/dbGestor/dbReceitas";

type Tipo = "Despesa" | "Receita";
type Lancamento = Despesa | Receita;
const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function UnificarLancamentos({ tipo }: { tipo: Tipo }) {
  const router = useRouter();
  const [lista, setLista] = useState<Lancamento[]>([]);
  const [destinoId, setDestinoId] = useState<number | null>(null);
  const [origemId, setOrigemId] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    const dados = tipo === "Despesa" ? await listarDespesas() : await listarReceitas();
    const pendentes = dados.filter((item) => tipo === "Despesa" ? (item as Despesa).pago === 0 : (item as Receita).recebido === 0);
    setLista(pendentes);
    setDestinoId(null);
    setOrigemId(null);
  }, [tipo]);

  useFocusEffect(useCallback(() => { carregar().catch(console.error); }, [carregar]));
  const destino = lista.find((item) => item.id === destinoId);
  const origem = lista.find((item) => item.id === origemId);

  const confirmar = () => {
    if (!destino || !origem) return;
    Alert.alert("Confirmar unificação", `Somar ${moeda(origem.valor)} de “${origem.nome}” a “${destino.nome}”? O lançamento de origem será removido.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Unificar", onPress: () => { void (async () => {
        try {
          if (tipo === "Despesa") await unificarDespesas(origem.id, destino.id);
          else await unificarReceitas(origem.id, destino.id);
          Alert.alert("Pronto", `${tipo} unificada com sucesso.`);
          await carregar();
        } catch (erro) {
          Alert.alert("Erro", erro instanceof Error ? erro.message : "Não foi possível unificar os lançamentos.");
        }
      })(); } },
    ]);
  };

  const escolher = (item: Lancamento, papel: "destino" | "origem") => {
    if (papel === "destino") setDestinoId(item.id);
    else setOrigemId(item.id);
  };

  return <SafeAreaView style={s.container}>
    <View style={s.header}><TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={28} color="#1A1A1A" /></TouchableOpacity><Text style={s.titulo}>Unificar {tipo === "Despesa" ? "despesas" : "receitas"}</Text><InfoButton compacto titulo={`Unificar ${tipo === "Despesa" ? "despesas" : "receitas"}`} texto={`Escolha o lançamento que continuará e depois selecione o que será somado. Só aparecem ${tipo === "Despesa" ? "despesas não pagas" : "receitas ainda não recebidas"}. O valor é somado, o lançamento de origem é removido e a operação fica em Históricos > Unificações.`} /></View>
    <Text style={s.instrucao}>Escolha o lançamento que continuará com o valor total:</Text>
    <ScrollView contentContainerStyle={s.lista}>
      {lista.length === 0 ? <Text style={s.vazio}>Não há {tipo === "Despesa" ? "despesas não pagas" : "receitas não recebidas"} para unificar.</Text> : lista.map((item) => <TouchableOpacity key={item.id} style={[s.card, destinoId === item.id && s.selecionado]} onPress={() => escolher(item, "destino")}>
        <View style={s.linha}><Text style={s.nome}>{item.nome}</Text><Text style={s.valor}>{moeda(item.valor)}</Text></View><Text style={s.detalhe}>{tipo === "Despesa" ? `Vence ${item.vencimento}` : `A receber ${item.vencimento}`} · {item.tipo}</Text>
        {destinoId === item.id && <View style={s.origemBox}><Text style={s.rotuloOrigem}>Agora escolha o lançamento que será somado:</Text>{lista.filter((x) => x.id !== item.id).map((x) => <TouchableOpacity key={x.id} style={s.origemLinha} onPress={() => escolher(x, "origem")}><Ionicons name={origemId === x.id ? "radio-button-on" : "radio-button-off"} size={20} color="#00897B"/><Text style={s.origemNome}>{x.nome} · {moeda(x.valor)}</Text></TouchableOpacity>)}</View>}
      </TouchableOpacity>)}
    </ScrollView>
    <TouchableOpacity style={[s.botao, (!destino || !origem) && s.botaoDesativado]} disabled={!destino || !origem} onPress={confirmar}><Text style={s.botaoTexto}>Unificar lançamentos</Text></TouchableOpacity>
  </SafeAreaView>;
}

const s = StyleSheet.create({ container: { flex: 1, backgroundColor: "#F5F5F5", padding: 20 }, header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 }, titulo: { fontSize: 24, fontWeight: "bold", color: "#1A1A1A" }, instrucao: { color: "#555", marginBottom: 10 }, lista: { paddingBottom: 12 }, card: { backgroundColor: "white", borderRadius: 14, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: "transparent" }, selecionado: { borderColor: "#00897B" }, linha: { flexDirection: "row", justifyContent: "space-between", gap: 12 }, nome: { flex: 1, color: "#222", fontSize: 16, fontWeight: "bold" }, valor: { color: "#00897B", fontWeight: "bold" }, detalhe: { color: "#777", fontSize: 12, marginTop: 5 }, origemBox: { borderTopWidth: 1, borderTopColor: "#EEE", marginTop: 12, paddingTop: 10 }, rotuloOrigem: { color: "#555", marginBottom: 8, fontSize: 13 }, origemLinha: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 }, origemNome: { color: "#333", flex: 1 }, vazio: { textAlign: "center", marginTop: 40, color: "#888" }, botao: { backgroundColor: "#00897B", borderRadius: 12, alignItems: "center", padding: 15, marginTop: 10 }, botaoDesativado: { opacity: 0.45 }, botaoTexto: { color: "white", fontWeight: "bold" } });
