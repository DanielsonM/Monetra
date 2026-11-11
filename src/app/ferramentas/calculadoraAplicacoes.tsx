import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { listarAplicacoes, type Aplicacao } from "../../database/dbGestor/dbAplicacoes";

const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function valorNumerico(texto: string) {
  const normalizado = texto.replace(/\s/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const valor = Number.parseFloat(normalizado);
  return Number.isFinite(valor) ? valor : 0;
}

export default function CalculadoraAplicacoes() {
  const router = useRouter();
  const [aplicacoes, setAplicacoes] = useState<Aplicacao[]>([]);
  const [selecionadas, setSelecionadas] = useState<number[]>([]);
  const [gasto, setGasto] = useState("");
  const [erro, setErro] = useState(false);

  useFocusEffect(useCallback(() => {
    let ativa = true;
    setSelecionadas([]);
    setGasto("");
    setErro(false);
    void listarAplicacoes().then((lista) => {
      if (ativa) setAplicacoes(lista);
    }).catch((e) => {
      console.error("Não foi possível carregar as aplicações para a simulação.", e);
      if (ativa) setErro(true);
    });
    return () => {
      ativa = false;
      setSelecionadas([]);
      setGasto("");
    };
  }, []));

  const totalSelecionado = useMemo(() => aplicacoes.reduce((total, item) =>
    selecionadas.includes(item.id) ? total + item.valor : total, 0), [aplicacoes, selecionadas]);
  const restante = totalSelecionado - valorNumerico(gasto);
  const todasSelecionadas = aplicacoes.length > 0 && selecionadas.length === aplicacoes.length;

  const alternar = (id: number) => setSelecionadas((atuais) =>
    atuais.includes(id) ? atuais.filter((selecionado) => selecionado !== id) : [...atuais, id]);
  const alternarTodas = () => setSelecionadas(todasSelecionadas ? [] : aplicacoes.map((item) => item.id));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace("/ferramentas")} hitSlop={10} accessibilityRole="button" accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={27} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Simular gasto</Text>
      </View>
      <Text style={styles.ajuda}>Escolha as aplicações que pretende usar e informe o valor do possível gasto.</Text>

      <View style={styles.secaoTopo}>
        <Text style={styles.secaoTitulo}>Aplicações</Text>
        <TouchableOpacity onPress={alternarTodas} disabled={aplicacoes.length === 0} accessibilityRole="button">
          <Text style={[styles.link, aplicacoes.length === 0 && styles.desabilitado]}>{todasSelecionadas ? "Desmarcar todos" : "Selecionar todos"}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={aplicacoes}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.lista}
        ListEmptyComponent={<View style={styles.vazio}><Text style={styles.vazioTexto}>{erro ? "Não foi possível carregar as aplicações." : "Nenhuma aplicação cadastrada."}</Text></View>}
        renderItem={({ item }) => {
          const marcado = selecionadas.includes(item.id);
          return (
            <TouchableOpacity style={styles.item} onPress={() => alternar(item.id)} activeOpacity={0.75} accessibilityRole="checkbox" accessibilityState={{ checked: marcado }}>
              <View style={[styles.checkbox, marcado && styles.checkboxMarcado]}>{marcado && <Ionicons name="checkmark" size={17} color="#FFFFFF" />}</View>
              <View style={styles.info}><Text style={styles.banco} numberOfLines={1}>{item.banco}</Text><Text style={styles.saldoLabel}>Saldo disponível</Text></View>
              <Text style={styles.saldo}>{moeda(item.valor)}</Text>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.painel}>
        <View style={styles.linha}><Text style={styles.rotulo}>Total selecionado</Text><Text style={styles.total}>{moeda(totalSelecionado)}</Text></View>
        <Text style={styles.labelInput}>Valor do possível gasto</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.prefixo}>R$</Text>
          <TextInput style={styles.input} value={gasto} onChangeText={(valor) => setGasto(valor.replace(/[^\d,]/g, ""))} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor="#9E9E9E" accessibilityLabel="Valor do possível gasto" />
        </View>
        <View style={[styles.resultado, restante < 0 && styles.resultadoNegativo]}>
          <View><Text style={styles.resultadoLabel}>{restante < 0 ? "Valor que falta" : "Sobrará após o gasto"}</Text><Text style={[styles.resultadoValor, restante < 0 && styles.valorNegativo]}>{moeda(Math.abs(restante))}</Text></View>
          <Ionicons name={restante < 0 ? "alert-circle-outline" : "wallet-outline"} size={27} color={restante < 0 ? "#C62828" : "#1565C0"} />
        </View>
        <Text style={styles.nota}>Simulação informativa. Nenhum saldo ou lançamento será alterado.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", paddingHorizontal: 18, paddingTop: 8 },
  cabecalho: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  titulo: { fontSize: 24, fontWeight: "bold", color: "#1A1A1A" },
  ajuda: { color: "#666666", fontSize: 14, lineHeight: 20, marginBottom: 17 },
  secaoTopo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 },
  secaoTitulo: { fontSize: 16, color: "#222222", fontWeight: "700" },
  link: { color: "#1565C0", fontSize: 14, fontWeight: "600" },
  desabilitado: { color: "#AAAAAA" },
  lista: { paddingBottom: 12, flexGrow: 1 },
  item: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 13, padding: 13, marginBottom: 8, gap: 11 },
  checkbox: { width: 23, height: 23, borderRadius: 6, borderWidth: 1.5, borderColor: "#9E9E9E", alignItems: "center", justifyContent: "center" },
  checkboxMarcado: { borderColor: "#1565C0", backgroundColor: "#1565C0" },
  info: { flex: 1 },
  banco: { fontSize: 15, fontWeight: "600", color: "#222222" },
  saldoLabel: { fontSize: 12, color: "#888888", marginTop: 3 },
  saldo: { color: "#1565C0", fontSize: 14, fontWeight: "700" },
  vazio: { padding: 22, alignItems: "center" },
  vazioTexto: { color: "#777777", fontSize: 14, textAlign: "center" },
  painel: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, marginBottom: 10, shadowColor: "#000000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5, elevation: 3 },
  linha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 15 },
  rotulo: { color: "#555555", fontSize: 14 },
  total: { color: "#1565C0", fontSize: 17, fontWeight: "700" },
  labelInput: { color: "#333333", fontSize: 13, fontWeight: "600", marginBottom: 7 },
  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#F5F7FA", borderWidth: 1, borderColor: "#E1E5EA", borderRadius: 11, paddingHorizontal: 12 },
  prefixo: { color: "#555555", fontSize: 16, fontWeight: "600", marginRight: 8 },
  input: { flex: 1, height: 48, fontSize: 19, color: "#222222" },
  resultado: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#EAF3FF", borderRadius: 12, padding: 13, marginTop: 13 },
  resultadoNegativo: { backgroundColor: "#FDECEC" },
  resultadoLabel: { color: "#555555", fontSize: 12 },
  resultadoValor: { color: "#1565C0", fontSize: 21, fontWeight: "bold", marginTop: 3 },
  valorNegativo: { color: "#C62828" },
  nota: { color: "#888888", fontSize: 11, textAlign: "center", marginTop: 10 },
});
