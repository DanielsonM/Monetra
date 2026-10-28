import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { inserirDespesa, pagarDespesa } from "../../database/dbGestor/dbDespesas";

export default function GastoRapido() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState("Outros");
  const [salvando, setSalvando] = useState(false);
  const hoje = new Date();
  const data = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

  const salvar = async () => {
    const numero = Number(valor.replace(/\./g, "").replace(",", "."));
    if (!nome.trim() || !Number.isFinite(numero) || numero <= 0 || !categoria.trim()) {
      Alert.alert("Confira os dados", "Informe o nome, um valor válido e a categoria.");
      return;
    }
    try {
      setSalvando(true);
      const id = await inserirDespesa({ nome: nome.trim(), valor: numero, tipo: categoria.trim(), vencimento: data });
      await pagarDespesa(id);
      Alert.alert("Gasto registrado", "A despesa foi marcada como paga e descontada do saldo disponível.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível registrar o gasto.");
    } finally { setSalvando(false); }
  };

  return <SafeAreaView style={styles.container}>
    <View style={styles.header}><TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={26} color="#222" /></TouchableOpacity><Text style={styles.titulo}>Gasto rápido</Text></View>
    <Text style={styles.ajuda}>Registre uma compra já paga com os dados essenciais.</Text>
    <Text style={styles.label}>O que você pagou?</Text><TextInput style={styles.campo} placeholder="Ex.: Café" value={nome} onChangeText={setNome} returnKeyType="next" />
    <Text style={styles.label}>Valor</Text><TextInput style={styles.campo} placeholder="Ex.: 12,50" value={valor} onChangeText={setValor} keyboardType="decimal-pad" />
    <Text style={styles.label}>Categoria</Text><TextInput style={styles.campo} placeholder="Ex.: Alimentação" value={categoria} onChangeText={setCategoria} />
    <TouchableOpacity style={styles.botao} onPress={salvar} disabled={salvando}><Text style={styles.botaoTexto}>{salvando ? "Salvando..." : "Registrar gasto pago"}</Text></TouchableOpacity>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ container:{flex:1,backgroundColor:"#F5F5F5",padding:20},header:{flexDirection:"row",alignItems:"center",gap:14,marginBottom:18},titulo:{fontSize:24,fontWeight:"bold",color:"#1A1A1A"},ajuda:{fontSize:14,color:"#666",marginBottom:22},label:{fontSize:14,fontWeight:"bold",color:"#333",marginBottom:6,marginTop:12},campo:{backgroundColor:"white",borderRadius:12,padding:14,fontSize:16},botao:{backgroundColor:"#00897B",padding:16,borderRadius:12,alignItems:"center",marginTop:26},botaoTexto:{color:"white",fontWeight:"bold",fontSize:16} });
