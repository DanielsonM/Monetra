import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { listarAplicacoes, type Aplicacao } from "../database/dbGestor/dbAplicacoes";
import InfoButton from "./infoButton";

const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (data: string) => `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}`;

export default function AplicacoesRecentes() {
  const [aplicacoes, setAplicacoes] = useState<Aplicacao[]>([]);
  const [aberto, setAberto] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setAplicacoes((await listarAplicacoes()).slice(0, 3));
    } catch (erro) {
      console.error(erro);
    }
  }, []);

  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  return (
    <View style={styles.secao}>
      <View style={styles.cardSecao}>
        <TouchableOpacity style={[styles.cabecalho, aberto && styles.cabecalhoAberto]} onPress={() => setAberto((valor) => !valor)} activeOpacity={0.7} accessibilityRole="button" accessibilityState={{ expanded: aberto }}>
          <View style={styles.tituloLinha}>
            <Text style={styles.titulo}>Aplicações Recentes</Text>
            <InfoButton compacto titulo="Aplicações recentes" texto="Mostra as três aplicações financeiras cadastradas mais recentemente. Toque no nome de uma aplicação para editar ou no card para consultar todas." />
          </View>
          <View style={styles.cabecalhoDireita}>
            {!aberto && aplicacoes.length > 0 && <Text style={styles.resumoFechado}>{aplicacoes.length} {aplicacoes.length === 1 ? "item" : "itens"}</Text>}
            <Ionicons name={aberto ? "chevron-down" : "chevron-forward"} size={24} color="#666666" />
          </View>
        </TouchableOpacity>

        {aberto && (
          <View style={styles.lista}>
            {aplicacoes.map((aplicacao) => (
              <TouchableOpacity key={aplicacao.id} style={styles.item} activeOpacity={0.75} onPress={() => router.push({ pathname: "/cadastros/cadAplicacao", params: { id: String(aplicacao.id) } } as never)}>
                <View style={[styles.icone, { backgroundColor: aplicacao.banco_cor || "#1565C0" }]}><Ionicons name="business-outline" size={22} color="#FFFFFF" /></View>
                <View style={styles.infoBanco}>
                  <Text style={styles.banco} numberOfLines={1}>{aplicacao.banco}</Text>
                  {aplicacao.ultimo_saque_valor != null && aplicacao.ultimo_saque_data && <Text style={styles.movimento} numberOfLines={1}>Último saque: {moeda(aplicacao.ultimo_saque_valor)} · {dataBR(aplicacao.ultimo_saque_data)}</Text>}
                </View>
                <Text style={styles.valor}>{moeda(aplicacao.valor)}</Text>
              </TouchableOpacity>
            ))}
            {aplicacoes.length === 0 && <Text style={styles.vazio}>Nenhuma aplicação cadastrada</Text>}
            <TouchableOpacity style={styles.verTodas} onPress={() => router.push("/consultas/aplicacoes" as never)}>
              <Text style={styles.verTodasTexto}>Ver todas as aplicações</Text>
              <Ionicons name="chevron-forward" size={18} color="#00897B" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  secao: { marginBottom: 5 },
  cardSecao: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, marginBottom: 15, shadowColor: "#000000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cabecalho: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 26 },
  cabecalhoAberto: { marginBottom: 14 },
  tituloLinha: { flexDirection: "row", alignItems: "center", gap: 7 },
  titulo: { color: "#1A1A1A", fontSize: 18, fontWeight: "bold" },
  cabecalhoDireita: { flexDirection: "row", alignItems: "center", gap: 10 },
  resumoFechado: { color: "#666666", fontSize: 14, fontWeight: "bold" },
  lista: { gap: 10 },
  item: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E6E6E6", paddingBottom: 9 },
  icone: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#1565C0", justifyContent: "center", alignItems: "center" },
  banco: { flex: 1, minWidth: 0, color: "#1A1A1A", fontSize: 15, fontWeight: "bold" },
  infoBanco: { flex: 1, minWidth: 0, gap: 3 },
  movimento: { color: "#666666", fontSize: 11 },
  valor: { color: "#1A1A1A", fontSize: 14, fontWeight: "bold" },
  vazio: { color: "#999999", fontSize: 14, textAlign: "center", paddingVertical: 8 },
  verTodas: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingTop: 3 },
  verTodasTexto: { color: "#10B981", fontSize: 14, fontWeight: "bold" },
});
