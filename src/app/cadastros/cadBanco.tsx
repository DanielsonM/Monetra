import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InfoButton from "../../components/infoButton";
import { atualizarBanco, buscarBanco, inserirBanco } from "../../database/dbGestor/dbBancos";

const CORES_BANCOS = ["#1565C0", "#00897B", "#2E7D32", "#7B1FA2", "#C62828", "#F57C00", "#3949AB", "#00838F", "#6D4C41", "#546E7A", "#AD1457", "#424242"];

export default function CadBanco() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const idEdicao = id ? Number(id) : null;
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(CORES_BANCOS[0]);
  const [carregando, setCarregando] = useState(idEdicao !== null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (idEdicao === null) return;
    let ativo = true;
    buscarBanco(idEdicao).then((banco) => {
      if (!ativo) return;
      if (!banco) {
        Alert.alert("Erro", "Banco não encontrado.");
        router.back();
        return;
      }
      setNome(banco.nome);
      setCor(banco.cor);
    }).catch((erro) => {
      console.error(erro);
      Alert.alert("Erro", "Não foi possível carregar o banco.");
    }).finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [idEdicao, router]);

  const salvar = async () => {
    if (!nome.trim()) {
      Alert.alert("Atenção", "Informe o nome do banco.");
      return;
    }
    try {
      setSalvando(true);
      const dados = { nome: nome.trim(), cor };
      if (idEdicao !== null) await atualizarBanco(idEdicao, dados);
      else await inserirBanco(dados);
      Alert.alert("Pronto", idEdicao === null ? "Banco cadastrado." : "Banco atualizado.");
      router.back();
    } catch (erro) {
      console.error(erro);
      Alert.alert("Erro", "Não foi possível salvar. Verifique se já existe um banco com esse nome.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}><Ionicons name="arrow-back" size={28} color="#1A1A1A" /></TouchableOpacity>
        <Text style={styles.titulo}>{idEdicao === null ? "Cadastrar banco" : "Editar banco"}</Text>
        <InfoButton compacto titulo="Cadastro de banco" texto="Cadastre o nome e escolha uma cor. O banco poderá ser vinculado às receitas recebidas e às aplicações financeiras." />
      </View>
      <Text style={styles.label}>Nome do banco *</Text>
      <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Ex.: Banco Central" autoCapitalize="words" maxLength={60} />
      <Text style={styles.label}>Cor</Text>
      <View style={styles.paleta}>
        {CORES_BANCOS.map((opcao) => (
          <TouchableOpacity key={opcao} style={[styles.opcaoCor, cor === opcao && styles.opcaoSelecionada]} onPress={() => setCor(opcao)} accessibilityRole="button" accessibilityLabel={`Selecionar cor ${opcao}`} accessibilityState={{ selected: cor === opcao }}>
            <View style={[styles.amostraCor, { backgroundColor: opcao }]} />
            {cor === opcao && <Ionicons name="checkmark" size={17} color="#FFFFFF" style={styles.check} />}
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.previa}><View style={[styles.bolinha, { backgroundColor: cor }]} /><Text style={styles.previaNome}>{nome.trim() || "Nome do banco"}</Text></View>
      <TouchableOpacity style={[styles.botao, (salvando || carregando) && styles.botaoDesativado]} onPress={salvar} disabled={salvando || carregando}>
        <Text style={styles.botaoTexto}>{salvando ? "Salvando..." : idEdicao === null ? "Cadastrar banco" : "Salvar alterações"}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 20 },
  cabecalho: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  titulo: { flex: 1, fontSize: 24, fontWeight: "bold", color: "#1A1A1A" },
  label: { fontSize: 14, color: "#666666", marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: "#1A1A1A" },
  paleta: { flexDirection: "row", flexWrap: "wrap", gap: 12, padding: 10 },
  opcaoCor: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "transparent" },
  opcaoSelecionada: { borderColor: "#222222" },
  amostraCor: { width: 30, height: 30, borderRadius: 15 },
  check: { position: "absolute" },
  previa: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16, padding: 14, borderRadius: 12, backgroundColor: "#FFFFFF" },
  bolinha: { width: 24, height: 24, borderRadius: 12 },
  previaNome: { color: "#222222", fontSize: 16, fontWeight: "600" },
  botao: { backgroundColor: "#00897B", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  botaoDesativado: { opacity: 0.55 },
  botaoTexto: { color: "#FFFFFF", fontSize: 17, fontWeight: "bold" },
});
