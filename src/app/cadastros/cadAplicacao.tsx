import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InfoButton from "../../components/infoButton";
import { atualizarAplicacao, buscarAplicacao, inserirAplicacao } from "../../database/dbGestor/dbAplicacoes";

const formatarValor = (texto: string) => {
  const digitos = texto.replace(/\D/g, "").slice(0, 12);
  if (!digitos) return "";
  return (Number(digitos) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const valorParaNumero = (texto: string) => Number(texto.replace(/\./g, "").replace(",", ".")) || 0;
const numeroParaTexto = (valor: number) => (valor * 100).toFixed(0);

export default function CadAplicacao() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const idEdicao = id ? Number(id) : null;
  const editando = idEdicao !== null;
  const [banco, setBanco] = useState("");
  const [valor, setValor] = useState("");
  const [carregando, setCarregando] = useState(editando);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (idEdicao === null) return;
    let ativo = true;
    buscarAplicacao(idEdicao)
      .then((aplicacao) => {
        if (!ativo) return;
        if (!aplicacao) {
          Alert.alert("Erro", "Aplicação não encontrada.");
          router.back();
          return;
        }
        setBanco(aplicacao.banco);
        setValor(formatarValor(numeroParaTexto(aplicacao.valor)));
      })
      .catch((erro) => {
        console.error(erro);
        Alert.alert("Erro", "Não foi possível carregar a aplicação.");
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => { ativo = false; };
  }, [idEdicao, router]);

  const salvar = async () => {
    const valorNumero = valorParaNumero(valor);
    if (!banco.trim() || valorNumero <= 0) {
      Alert.alert("Atenção", "Informe o nome do banco e um valor maior que zero.");
      return;
    }
    try {
      setSalvando(true);
      const dados = { banco: banco.trim(), valor: valorNumero };
      if (idEdicao !== null) {
        await atualizarAplicacao(idEdicao, dados);
        Alert.alert("Pronto", "Aplicação atualizada.");
      } else {
        await inserirAplicacao(dados);
        Alert.alert("Pronto", "Aplicação cadastrada.");
      }
      router.back();
    } catch (erro) {
      console.error(erro);
      Alert.alert("Erro", "Não foi possível salvar a aplicação.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={28} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.titulo}>{editando ? "Editar aplicação" : "Nova aplicação"}</Text>
        <InfoButton compacto titulo="Aplicação financeira" texto="Cadastre o banco e o valor que você mantém aplicado. O total das aplicações aparece no card da tela inicial e não altera o saldo disponível." />
      </View>

      <Text style={styles.label}>Nome do banco</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex.: Banco do Brasil"
        value={banco}
        onChangeText={setBanco}
        autoCapitalize="words"
        maxLength={60}
      />

      <Text style={styles.label}>Valor aplicado</Text>
      <View style={styles.campoValor}>
        <Text style={styles.prefixo}>R$</Text>
        <TextInput
          style={styles.inputValor}
          placeholder="0,00"
          keyboardType="number-pad"
          value={valor}
          onChangeText={(texto) => setValor(formatarValor(texto))}
        />
      </View>

      <TouchableOpacity style={[styles.botao, (salvando || carregando) && styles.botaoDesativado]} onPress={salvar} disabled={salvando || carregando}>
        <Text style={styles.botaoTexto}>{salvando ? "Salvando..." : editando ? "Salvar alterações" : "Salvar aplicação"}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 20 },
  cabecalho: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  titulo: { flex: 1, fontSize: 24, fontWeight: "bold", color: "#1A1A1A" },
  label: { fontSize: 14, color: "#666666", marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: "#1A1A1A" },
  campoValor: { backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 14, flexDirection: "row", alignItems: "center" },
  prefixo: { fontSize: 18, color: "#666666", marginRight: 8 },
  inputValor: { flex: 1, paddingVertical: 12, fontSize: 18, color: "#1A1A1A" },
  botao: { backgroundColor: "#00897B", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 30 },
  botaoDesativado: { opacity: 0.6 },
  botaoTexto: { color: "#FFFFFF", fontSize: 17, fontWeight: "bold" },
});
