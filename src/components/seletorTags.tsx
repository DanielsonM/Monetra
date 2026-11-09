import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { listarTags, type Tag } from "../database/dbGestor/dbTags";

type Props = { selecionadas: number[]; onChange: (ids: number[]) => void };

export default function SeletorTags({ selecionadas, onChange }: Props) {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);

  useFocusEffect(useCallback(() => {
    let ativo = true;
    listarTags().then((lista) => { if (ativo) setTags(lista); }).catch(() => Alert.alert("Erro", "Não foi possível carregar as tags."));
    return () => { ativo = false; };
  }, []));

  const alternar = (id: number) => onChange(selecionadas.includes(id)
    ? selecionadas.filter((selecionada) => selecionada !== id)
    : [...selecionadas, id]);

  return (
    <View>
      <Text style={styles.label}>Tags (opcional)</Text>
      {tags.length > 0 ? <View style={styles.lista}>
        {tags.map((tag) => {
          const ativa = selecionadas.includes(tag.id);
          return <TouchableOpacity key={tag.id} style={[styles.tag, ativa && styles.tagAtiva]} onPress={() => alternar(tag.id)} accessibilityRole="checkbox" accessibilityState={{ checked: ativa }}>
            <Text style={[styles.tagTexto, ativa && styles.tagTextoAtivo]}>{tag.nome}</Text>
          </TouchableOpacity>;
        })}
      </View> : <Text style={styles.vazio}>Nenhuma tag cadastrada.</Text>}
      <TouchableOpacity style={styles.gerenciar} onPress={() => router.push("/cadastros/tags" as never)} accessibilityRole="button">
        <Ionicons name="pricetag-outline" size={17} color="#00796B" />
        <Text style={styles.gerenciarTexto}>Cadastrar ou gerenciar tags</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, color: "#666666", marginBottom: 8, marginTop: 14 },
  lista: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { borderRadius: 18, borderWidth: 1, borderColor: "#D0D0D0", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#FFFFFF" },
  tagAtiva: { borderColor: "#00897B", backgroundColor: "#E0F2F1" },
  tagTexto: { color: "#555555", fontSize: 13 },
  tagTextoAtivo: { color: "#00796B", fontWeight: "600" },
  vazio: { color: "#999999", fontSize: 13, marginBottom: 6 },
  gerenciar: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 9 },
  gerenciarTexto: { color: "#00796B", fontSize: 13, fontWeight: "600" },
});
