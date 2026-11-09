import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { criarTag, excluirTag, listarTags, type Tag } from "../../database/dbGestor/dbTags";

export default function CadastroTags() {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [nome, setNome] = useState("");

  const carregar = useCallback(async () => setTags(await listarTags()), []);
  useFocusEffect(useCallback(() => { void carregar().catch(() => Alert.alert("Erro", "Não foi possível carregar as tags.")); }, [carregar]));

  const adicionar = async () => {
    if (!nome.trim()) {
      Alert.alert("Informe um nome", "Digite o nome da tag para cadastrá-la.");
      return;
    }
    try {
      await criarTag(nome);
      setNome("");
      await carregar();
    } catch (erro) {
      Alert.alert("Tag não cadastrada", erro instanceof Error ? erro.message : "Não foi possível cadastrar a tag.");
    }
  };

  const confirmarExclusao = (tag: Tag) => Alert.alert("Excluir tag", `Deseja excluir a tag “${tag.nome}”? Ela também será removida das receitas e despesas vinculadas.`, [
    { text: "Cancelar", style: "cancel" },
    { text: "Excluir", style: "destructive", onPress: async () => {
      try { await excluirTag(tag.id); await carregar(); }
      catch { Alert.alert("Erro", "Não foi possível excluir a tag."); }
    } },
  ]);

  return <SafeAreaView style={styles.container}>
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace("/home/home")} accessibilityRole="button" accessibilityLabel="Voltar">
        <Ionicons name="arrow-back" size={27} color="#222222" />
      </TouchableOpacity>
      <Text style={styles.titulo}>Tags</Text>
    </View>
    <Text style={styles.descricao}>Crie tags para organizar e identificar suas receitas e despesas.</Text>
    <View style={styles.formulario}>
      <TextInput style={styles.input} placeholder="Nome da tag *" value={nome} onChangeText={setNome} maxLength={30} returnKeyType="done" onSubmitEditing={() => void adicionar()} accessibilityLabel="Nome da tag, obrigatório" />
      <TouchableOpacity style={styles.botaoAdicionar} onPress={() => void adicionar()} accessibilityRole="button" accessibilityLabel="Cadastrar tag">
        <Ionicons name="add" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
    <FlatList
      data={tags}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.lista}
      ListEmptyComponent={<Text style={styles.vazio}>Nenhuma tag cadastrada.</Text>}
      renderItem={({ item }) => <View style={styles.card}>
        <View style={styles.nomeTag}><Ionicons name="pricetag-outline" size={18} color="#00897B" /><Text style={styles.textoTag}>{item.nome}</Text></View>
        <TouchableOpacity onPress={() => confirmarExclusao(item)} accessibilityRole="button" accessibilityLabel={`Excluir tag ${item.nome}`} hitSlop={10}>
          <Ionicons name="trash-outline" size={20} color="#D32F2F" />
        </TouchableOpacity>
      </View>}
    />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  titulo: { fontSize: 27, fontWeight: "bold", color: "#1A1A1A" },
  descricao: { fontSize: 14, lineHeight: 20, color: "#666666", marginBottom: 14 },
  formulario: { flexDirection: "row", gap: 8, marginBottom: 14 },
  input: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: "#1A1A1A" },
  botaoAdicionar: { width: 48, borderRadius: 12, backgroundColor: "#00897B", alignItems: "center", justifyContent: "center" },
  lista: { paddingBottom: 24, flexGrow: 1 },
  card: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#FFFFFF", borderRadius: 12, marginBottom: 8 },
  nomeTag: { flexDirection: "row", alignItems: "center", gap: 10 },
  textoTag: { fontSize: 15, color: "#222222" },
  vazio: { color: "#888888", textAlign: "center", marginTop: 24 },
});
