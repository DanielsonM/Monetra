import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { buscarRelatorioParcelamentos, type GrupoParcelamentoRelatorio } from "../../database/dbGestor/dbFerramentas";

const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const escapar = (valor: string) => valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export default function RelatorioParcelamentos() {
  const router = useRouter();
  const [grupos, setGrupos] = useState<GrupoParcelamentoRelatorio[]>([]);
  const [carregando, setCarregando] = useState(false);
  useFocusEffect(useCallback(() => { void buscarRelatorioParcelamentos().then(setGrupos).catch((erro) => { console.error(erro); Alert.alert("Erro", "Não foi possível carregar o relatório de parcelamentos."); }); }, []));

  const resumo = useMemo(() => grupos.reduce((acc, g) => ({
    total: acc.total + g.valor_total,
    pendente: acc.pendente + g.pendente,
    grupos: acc.grupos + 1,
  }), { total: 0, pendente: 0, grupos: 0 }), [grupos]);

  const compartilhar = async (uri: string, mimeType: string) => {
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType });
    else Alert.alert("Arquivo criado", uri);
  };
  const exportarCsv = async () => {
    try {
      setCarregando(true);
      const linhas = grupos.map((g) => [g.natureza, g.nome, g.tipo, g.quantidade, g.concluidas, g.valor_total.toFixed(2).replace(".", ","), g.pendente.toFixed(2).replace(".", ","), g.modo_valor === "total" ? "Valor total" : "Valor por parcela"]);
      const csv = [["Natureza", "Nome", "Tags", "Parcelas", "Concluídas", "Valor total", "Pendente", "Modo do valor"], ...linhas].map((linha) => linha.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
      const arquivo = new File(Paths.cache, "monetra-parcelamentos.csv");
      arquivo.write(`\uFEFF${csv}`);
      await compartilhar(arquivo.uri, "text/csv");
    } catch (erro) { console.error(erro); Alert.alert("Erro", "Não foi possível gerar o CSV."); }
    finally { setCarregando(false); }
  };
  const exportarPdf = async () => {
    try {
      setCarregando(true);
      const linhas = grupos.map((g) => `<tr><td>${escapar(g.natureza)}</td><td>${escapar(g.nome)}</td><td>${escapar(g.tipo)}</td><td>${g.concluidas}/${g.quantidade}</td><td>${moeda(g.valor_total)}</td><td>${moeda(g.pendente)}</td></tr>`).join("");
      const html = `<meta charset="utf-8"><style>body{font-family:Arial;padding:24px;color:#222}h1{color:#00897b}table{width:100%;border-collapse:collapse;font-size:11px}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left}th{background:#e0f2f1}</style><h1>Relatório de parcelamentos</h1><p>${grupos.length} grupos · Total ${moeda(resumo.total)} · Pendente ${moeda(resumo.pendente)}</p><table><thead><tr><th>Natureza</th><th>Nome</th><th>Tags</th><th>Concluídas</th><th>Total</th><th>Pendente</th></tr></thead><tbody>${linhas}</tbody></table>`;
      const resultado = await Print.printToFileAsync({ html });
      await compartilhar(resultado.uri, "application/pdf");
    } catch (erro) { console.error(erro); Alert.alert("Erro", "Não foi possível gerar o PDF."); }
    finally { setCarregando(false); }
  };

  return <SafeAreaView style={styles.container}>
    <View style={styles.header}><TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={26} color="#222222" /></TouchableOpacity><Text style={styles.titulo}>Relatório de parcelamentos</Text></View>
    <View style={styles.resumo}><Text style={styles.resumoTexto}>{resumo.grupos} grupos · {moeda(resumo.total)} no total · {moeda(resumo.pendente)} pendentes</Text></View>
    <TouchableOpacity disabled={carregando} style={styles.botao} onPress={exportarCsv}><Ionicons name="document-text-outline" size={20} color="#FFFFFF" /><Text style={styles.botaoTexto}>{carregando ? "Preparando..." : "Exportar CSV"}</Text></TouchableOpacity>
    <TouchableOpacity disabled={carregando} style={styles.botaoPdf} onPress={exportarPdf}><Ionicons name="document-outline" size={20} color="#00897B" /><Text style={styles.botaoPdfTexto}>Exportar PDF</Text></TouchableOpacity>
    <ScrollView style={styles.lista} contentContainerStyle={styles.listaConteudo}>
      {grupos.length === 0 && <Text style={styles.vazio}>Ainda não há grupos parcelados cadastrados.</Text>}
      {grupos.map((g) => <View key={g.id} style={styles.card}>
        <View style={styles.topo}><View style={[styles.ponto, { backgroundColor: g.natureza === "Receita" ? "#2E7D32" : "#D32F2F" }]} /><Text style={styles.nome}>{g.nome}</Text><Text style={styles.natureza}>{g.natureza}</Text></View>
        <Text style={styles.detalhe}>{g.tipo} · {g.concluidas} de {g.quantidade} {g.natureza === "Receita" ? "recebidas" : "pagas"}</Text>
        <View style={styles.valores}><Text style={styles.total}>Total {moeda(g.valor_total)}</Text><Text style={styles.pendente}>Pendente {moeda(g.pendente)}</Text></View>
      </View>)}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 18 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 15 },
  titulo: { fontSize: 22, fontWeight: "bold", color: "#222222", flex: 1 },
  resumo: { padding: 14, marginBottom: 10, backgroundColor: "#E0F2F1", borderRadius: 12 },
  resumoTexto: { fontSize: 13, color: "#00695C", fontWeight: "bold" },
  botao: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, backgroundColor: "#00897B", padding: 13, borderRadius: 10 },
  botaoTexto: { color: "#FFFFFF", fontWeight: "bold" },
  botaoPdf: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#00897B", padding: 12, borderRadius: 10, marginTop: 8 },
  botaoPdfTexto: { color: "#00897B", fontWeight: "bold" },
  lista: { marginTop: 12 },
  listaConteudo: { paddingBottom: 24 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2 },
  topo: { flexDirection: "row", alignItems: "center", gap: 8 },
  ponto: { width: 10, height: 10, borderRadius: 5 },
  nome: { flex: 1, fontSize: 15, fontWeight: "bold", color: "#222222" },
  natureza: { fontSize: 12, color: "#777777" },
  detalhe: { fontSize: 12, color: "#666666", marginTop: 7 },
  valores: { flexDirection: "row", justifyContent: "space-between", marginTop: 9 },
  total: { fontSize: 13, fontWeight: "bold", color: "#333333" },
  pendente: { fontSize: 13, fontWeight: "bold", color: "#D32F2F" },
  vazio: { padding: 20, textAlign: "center", color: "#777777" },
});
