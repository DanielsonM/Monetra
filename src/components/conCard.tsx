import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { totalDespesasPagas } from "../database/dbGestor/dbDespesas";
import { totalReceitasRecebidas } from "../database/dbGestor/dbReceitas";
import { totalAplicacoes } from "../database/dbGestor/dbAplicacoes";
import InfoButton from "./infoButton";

const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ConCard({ onPageChange }: { onPageChange?: (pagina: number) => void }) {
  const { width: larguraTela } = useWindowDimensions();
  const larguraCard = larguraTela - 40;
  const scrollRef = useRef<ScrollView>(null);
  const [somaReceitas, setSomaReceitas] = useState(0);
  const [somaDespesas, setSomaDespesas] = useState(0);
  const [somaAplicacoes, setSomaAplicacoes] = useState(0);
  const [pagina, setPagina] = useState(0);

  useFocusEffect(useCallback(() => {
    let ativo = true;
    Promise.all([totalReceitasRecebidas(), totalDespesasPagas(), totalAplicacoes()])
      .then(([receitas, despesas, aplicacoes]) => {
        if (!ativo) return;
        setSomaReceitas(receitas);
        setSomaDespesas(despesas);
        setSomaAplicacoes(aplicacoes);
      })
      .catch((erro) => console.error(erro));
    return () => { ativo = false; };
  }, []));

  const aoRolar = (evento: NativeSyntheticEvent<NativeScrollEvent>) => {
    const indice = Math.round(evento.nativeEvent.contentOffset.x / larguraCard);
    setPagina(indice);
    onPageChange?.(indice);
  };

  const irParaPagina = (indice: number) => {
    setPagina(indice);
    onPageChange?.(indice);
    scrollRef.current?.scrollTo({ x: indice * larguraCard, animated: true });
  };

  const saldoDisponivel = somaReceitas - somaDespesas;
  const negativo = saldoDisponivel < 0;

  return (
    <View style={styles.container}>
      <ScrollView ref={scrollRef} horizontal pagingEnabled nestedScrollEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={aoRolar} style={styles.carrossel}>
        <View style={[styles.pagina, { width: larguraCard }]}>
          <View style={[styles.card, { backgroundColor: negativo ? "#D32F2F" : "#2E7D32" }]}>
            <View style={styles.tituloLinha}>
              <Text style={styles.rotulo}>Saldo disponível</Text>
              <InfoButton compacto titulo="Saldo disponível" texto="Mostra as receitas recebidas menos as despesas pagas. Aplicações financeiras são mostradas no card ao lado e não entram neste saldo." />
            </View>
            <Text style={styles.valor}>{moeda(saldoDisponivel)}</Text>
            <Text style={styles.toque}>Deslize para ver as aplicações</Text>
          </View>
        </View>
        <View style={[styles.pagina, { width: larguraCard }]}>
          <TouchableOpacity style={[styles.card, styles.cardAplicacoes]} activeOpacity={0.85} onPress={() => router.push("/consultas/aplicacoes" as never)} accessibilityRole="button" accessibilityLabel={`Aplicações financeiras, total de ${moeda(somaAplicacoes)}. Abrir consulta`}>
            <View style={styles.tituloLinha}>
              <Text style={styles.rotulo}>Aplicações financeiras</Text>
              <Ionicons name="chevron-forward-circle-outline" size={24} color="#E3F2FD" />
            </View>
            <Text style={styles.valor}>{moeda(somaAplicacoes)}</Text>
            <Text style={styles.toque}>Toque para consultar ou adicionar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <View style={styles.indicadores} accessibilityLabel={`Card ${pagina + 1} de 2`}>
        {[0, 1].map((indice) => (
          <TouchableOpacity key={indice} onPress={() => irParaPagina(indice)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Mostrar card ${indice + 1}`} accessibilityState={{ selected: pagina === indice }}>
            <View style={[styles.ponto, pagina === indice && styles.pontoAtivo]} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 25 },
  carrossel: { overflow: "visible" },
  pagina: { paddingRight: 0 },
  card: { height: 180, borderRadius: 30, justifyContent: "center", alignItems: "center", padding: 20, shadowColor: "#000000", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 6 },
  cardAplicacoes: { backgroundColor: "#1565C0" },
  tituloLinha: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 8 },
  rotulo: { fontSize: 16, color: "#E8F5E9" },
  valor: { fontSize: 32, fontWeight: "bold", color: "#FFFFFF" },
  toque: { fontSize: 12, color: "#E3F2FD", marginTop: 10 },
  indicadores: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 2, marginTop: 8 },
  ponto: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#BDBDBD", marginHorizontal: 5 },
  pontoAtivo: { width: 18, backgroundColor: "#00897B" },
});
