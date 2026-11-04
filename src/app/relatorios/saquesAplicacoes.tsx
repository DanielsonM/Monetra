import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { listarSaquesAplicacoes, type SaqueAplicacao } from "../../database/dbGestor/dbAplicacoes";

const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (data: string) => `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}`;
const escapar = (texto: string) => texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export default function RelatorioSaquesAplicacoes() {
  const router = useRouter();
  const hoje = new Date();
  const [mes, setMes] = useState(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`);
  const [saques, setSaques] = useState<SaqueAplicacao[]>([]);
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    try { setSaques(await listarSaquesAplicacoes(undefined, mes)); }
    catch (erro) { console.error(erro); }
  }, [mes]);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  const total = saques.reduce((soma, saque) => soma + saque.valor, 0);
  const compartilhar = async (uri: string, mimeType: string) => {
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType });
    else Alert.alert("Arquivo criado", uri);
  };

  const exportarCsv = async () => {
    try {
      setCarregando(true);
      const linhas = ["Data;Banco;Valor", ...saques.map((saque) => [dataBR(saque.data), saque.banco_nome, saque.valor.toFixed(2).replace(".", ",")].map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(";"))];
      const arquivo = new File(Paths.cache, `monetra-saques-aplicacoes-${mes}.csv`);
      arquivo.write(`\uFEFF${linhas.join("\r\n")}`);
      await compartilhar(arquivo.uri, "text/csv");
    } catch (erro) { console.error(erro); Alert.alert("Erro", "Não foi possível gerar o CSV."); }
    finally { setCarregando(false); }
  };

  const exportarPdf = async () => {
    try {
      setCarregando(true);
      const linhas = saques.map((saque) => `<tr><td>${dataBR(saque.data)}</td><td>${escapar(saque.banco_nome)}</td><td>${moeda(saque.valor)}</td></tr>`).join("");
      const html = `<meta charset="utf-8"><style>body{font-family:Arial;padding:24px;color:#222}h1{color:#1565c0}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:9px;border-bottom:1px solid #ddd;text-align:left}th{background:#e3f2fd}</style><h1>Saques de aplicações — ${escapar(mes)}</h1><p>${saques.length} movimentações · Total ${moeda(total)}</p><table><thead><tr><th>Data</th><th>Banco</th><th>Valor</th></tr></thead><tbody>${linhas}</tbody></table>`;
      const arquivo = await Print.printToFileAsync({ html });
      await compartilhar(arquivo.uri, "application/pdf");
    } catch (erro) { console.error(erro); Alert.alert("Erro", "Não foi possível gerar o PDF."); }
    finally { setCarregando(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}><Ionicons name="arrow-back" size={26} color="#222222" /></TouchableOpacity>
        <Text style={styles.titulo}>Saques de aplicações</Text>
      </View>
      <Text style={styles.label}>Mês (AAAA-MM)</Text>
      <TextInput style={styles.campo} value={mes} onChangeText={setMes} placeholder="2026-11" />
      <View style={styles.resumo}><Text style={styles.resumoTexto}>{saques.length} saques · Total retirado {moeda(total)}</Text></View>
      <TouchableOpacity disabled={carregando} style={styles.botao} onPress={exportarCsv}><Ionicons name="document-text-outline" size={20} color="#FFFFFF" /><Text style={styles.botaoTexto}>{carregando ? "Preparando..." : "Exportar CSV"}</Text></TouchableOpacity>
      <TouchableOpacity disabled={carregando} style={styles.botaoPdf} onPress={exportarPdf}><Ionicons name="document-outline" size={20} color="#1565C0" /><Text style={styles.botaoPdfTexto}>Exportar PDF</Text></TouchableOpacity>
      <ScrollView contentContainerStyle={styles.lista}>
        {saques.map((saque) => (
          <View key={saque.id} style={styles.item}>
            <View style={[styles.cor, { backgroundColor: saque.banco_cor }]} />
            <View style={styles.itemInfo}><Text style={styles.banco}>{saque.banco_nome}</Text><Text style={styles.data}>{dataBR(saque.data)}</Text></View>
            <Text style={styles.valor}>{moeda(saque.valor)}</Text>
          </View>
        ))}
        {saques.length === 0 && <Text style={styles.vazio}>Nenhum saque registrado neste mês.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 18 },
  cabecalho: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 15 },
  titulo: { fontSize: 23, fontWeight: "bold", color: "#222222" },
  label: { fontSize: 13, fontWeight: "bold", color: "#444444", marginBottom: 5, marginTop: 8 },
  campo: { backgroundColor: "#FFFFFF", borderRadius: 10, padding: 12, fontSize: 15 },
  resumo: { padding: 14, marginVertical: 12, backgroundColor: "#E3F2FD", borderRadius: 12 },
  resumoTexto: { fontSize: 14, color: "#0D47A1", fontWeight: "bold" },
  botao: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, backgroundColor: "#1565C0", padding: 14, borderRadius: 10 },
  botaoTexto: { color: "#FFFFFF", fontWeight: "bold" },
  botaoPdf: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#1565C0", padding: 13, borderRadius: 10, marginTop: 9 },
  botaoPdfTexto: { color: "#1565C0", fontWeight: "bold" },
  lista: { paddingTop: 15, paddingBottom: 20 },
  item: { backgroundColor: "#FFFFFF", padding: 13, borderRadius: 11, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  cor: { width: 13, height: 13, borderRadius: 7 },
  itemInfo: { flex: 1 },
  banco: { fontWeight: "bold", color: "#222222" },
  data: { fontSize: 12, color: "#777777", marginTop: 4 },
  valor: { fontSize: 14, fontWeight: "bold", color: "#1565C0" },
  vazio: { color: "#777777", textAlign: "center", paddingVertical: 24 },
});
