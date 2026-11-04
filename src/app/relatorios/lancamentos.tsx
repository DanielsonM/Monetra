import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { buscarLancamentos, type Lancamento } from "../../database/dbGestor/dbFerramentas";

const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const escapar = (valor: string) => valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export default function Relatorios() {
  const router = useRouter();
  const [itens, setItens] = useState<Lancamento[]>([]);
  const agora = new Date();
  const [mes, setMes] = useState(`${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`);
  const [categoria, setCategoria] = useState("");
  const [carregando, setCarregando] = useState(false);

  useFocusEffect(useCallback(() => { void buscarLancamentos().then(setItens).catch(console.error); }, []));

  const filtrados = useMemo(() => itens.filter((item) => item.data.startsWith(mes) && (!categoria || item.categoria.toLocaleLowerCase().includes(categoria.toLocaleLowerCase()))), [itens, mes, categoria]);
  const compartilhar = async (uri: string, mimeType: string) => {
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType });
    else Alert.alert("Arquivo criado", uri);
  };

  const exportarCsv = async () => {
    try {
      setCarregando(true);
      const csv = ["Data;Natureza;Nome;Categoria;Status;Valor", ...filtrados.map((item) => [item.data, item.natureza, item.nome, item.categoria, item.status, item.valor.toFixed(2).replace(".", ",")].map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(";"))].join("\r\n");
      const arquivo = new File(Paths.cache, `monetra-${mes}.csv`);
      arquivo.write(`\uFEFF${csv}`);
      await compartilhar(arquivo.uri, "text/csv");
    } catch (erro) { console.error(erro); Alert.alert("Erro", "Não foi possível gerar o CSV."); }
    finally { setCarregando(false); }
  };

  const exportarPdf = async () => {
    try {
      setCarregando(true);
      const linhas = filtrados.map((item) => `<tr><td>${escapar(item.data)}</td><td>${escapar(item.natureza)}</td><td>${escapar(item.nome)}</td><td>${escapar(item.categoria)}</td><td>${escapar(item.status)}</td><td>${moeda(item.valor)}</td></tr>`).join("");
      const html = `<meta charset="utf-8"><style>body{font-family:Arial;padding:24px;color:#222}h1{color:#00897b}table{width:100%;border-collapse:collapse;font-size:11px}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left}th{background:#e0f2f1}</style><h1>Relatório Monetra — ${escapar(mes)}</h1><p>${filtrados.length} lançamentos${categoria ? ` · categoria: ${escapar(categoria)}` : ""}</p><table><thead><tr><th>Data</th><th>Tipo</th><th>Nome</th><th>Categoria</th><th>Status</th><th>Valor</th></tr></thead><tbody>${linhas}</tbody></table>`;
      const resultado = await Print.printToFileAsync({ html });
      await compartilhar(resultado.uri, "application/pdf");
    } catch (erro) { console.error(erro); Alert.alert("Erro", "Não foi possível gerar o PDF."); }
    finally { setCarregando(false); }
  };

  const gastos = filtrados.filter((item) => item.natureza === "Despesa").reduce((soma, item) => soma + item.valor, 0);
  const receitas = filtrados.filter((item) => item.natureza === "Receita").reduce((soma, item) => soma + item.valor, 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={26} color="#222222" /></TouchableOpacity>
        <Text style={styles.titulo}>Relatório de lançamentos</Text>
      </View>
      <TouchableOpacity style={styles.saqueLink} onPress={() => router.push("/relatorios/saquesAplicacoes" as never)}>
        <View style={styles.saqueIcone}><Ionicons name="cash-outline" size={22} color="#FFFFFF" /></View>
        <View style={styles.saqueLinkInfo}><Text style={styles.saqueLinkTitulo}>Saques de aplicações</Text><Text style={styles.saqueLinkDetalhe}>Consultar movimentações e exportar relatório</Text></View>
        <Ionicons name="chevron-forward" size={22} color="#666666" />
      </TouchableOpacity>
      <Text style={styles.label}>Mês (AAAA-MM)</Text>
      <TextInput style={styles.campo} value={mes} onChangeText={setMes} placeholder="2026-11" />
      <Text style={styles.label}>Categoria (opcional)</Text>
      <TextInput style={styles.campo} value={categoria} onChangeText={setCategoria} placeholder="Todas as categorias" />
      <View style={styles.resumo}><Text style={styles.resumoTexto}>{filtrados.length} lançamentos · {moeda(receitas)} receitas · {moeda(gastos)} despesas</Text></View>
      <TouchableOpacity disabled={carregando} style={styles.botao} onPress={exportarCsv}><Ionicons name="document-text-outline" size={20} color="#FFFFFF" /><Text style={styles.botaoTexto}>{carregando ? "Preparando..." : "Exportar CSV"}</Text></TouchableOpacity>
      <TouchableOpacity disabled={carregando} style={styles.botaoPdf} onPress={exportarPdf}><Ionicons name="document-outline" size={20} color="#00897B" /><Text style={styles.botaoPdfTexto}>Exportar PDF</Text></TouchableOpacity>
      <ScrollView style={styles.lista}>{filtrados.map((item, indice) => <View style={styles.item} key={`${item.natureza}-${item.id}-${indice}`}><View style={styles.itemInfo}><Text style={styles.nome}>{item.nome}</Text><Text style={styles.detalhe}>{item.data} · {item.categoria} · {item.status}</Text></View><Text style={styles.valor}>{moeda(item.valor)}</Text></View>)}</ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 18 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 15 },
  titulo: { fontSize: 24, fontWeight: "bold", color: "#222222" },
  saqueLink: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderRadius: 13, padding: 13, marginBottom: 8, elevation: 2 },
  saqueIcone: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#1565C0", alignItems: "center", justifyContent: "center" },
  saqueLinkInfo: { flex: 1 },
  saqueLinkTitulo: { color: "#222222", fontSize: 15, fontWeight: "bold" },
  saqueLinkDetalhe: { color: "#777777", fontSize: 12, marginTop: 3 },
  label: { fontSize: 13, fontWeight: "bold", color: "#444444", marginBottom: 5, marginTop: 8 },
  campo: { backgroundColor: "#FFFFFF", borderRadius: 10, padding: 12, fontSize: 15 },
  resumo: { padding: 14, marginVertical: 12, backgroundColor: "#E0F2F1", borderRadius: 12 },
  resumoTexto: { fontSize: 13, color: "#00695C", fontWeight: "bold" },
  botao: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, backgroundColor: "#00897B", padding: 14, borderRadius: 10 },
  botaoTexto: { color: "#FFFFFF", fontWeight: "bold" },
  botaoPdf: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#00897B", padding: 13, borderRadius: 10, marginTop: 9 },
  botaoPdfTexto: { color: "#00897B", fontWeight: "bold" },
  lista: { marginTop: 15 },
  item: { backgroundColor: "#FFFFFF", padding: 12, borderRadius: 11, marginBottom: 8, flexDirection: "row", gap: 8 },
  itemInfo: { flex: 1 },
  nome: { fontWeight: "bold", color: "#222222" },
  detalhe: { fontSize: 11, color: "#777777", marginTop: 4 },
  valor: { fontSize: 13, fontWeight: "bold", color: "#333333" },
});
