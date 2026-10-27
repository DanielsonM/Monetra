import { Poppins_700Bold, useFonts } from "@expo-google-fonts/poppins";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ConCard from "../../components/conCard";
import DespesasRecentes from "../../components/despesasRecentes";
import MenuPrincipal from "../../components/menu";
import ResumoFinanceiro from "../../components/resumoFinanceiro";
import { sincronizarNotificacoes } from "../../services/notificacoes";

export default function Home() {
  // Fonte do título (Poppins Bold)
  const [fonteCarregada] = useFonts({ Poppins_700Bold });

  // Reagenda os avisos de vencimento sempre que a Home volta a ficar em foco
  useFocusEffect(
    useCallback(() => {
      // Só despesas não pagas
      sincronizarNotificacoes();

      // Para testar as notificações, tire as barras da linha abaixo.
      // Em 5 segundos deve aparecer uma notificação. Depois comente de novo.
      // testarNotificacao();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        {/* Título centralizado */}
        <Text style={[styles.titulo, fonteCarregada && styles.tituloFonte]}>
          Monetra
        </Text>

        {/* Botão ☰ e menu suspenso */}
        <MenuPrincipal />
      </View>

      {/* Conteúdo rolável (para caber as despesas recentes) */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.conteudo}
      >
        {/* Saldo disponível (lógica e cálculo dentro do ConCard) */}
        <ConCard />

        {/* Meu dinheiro e despesas totais (clicáveis, abrem os cadastros) */}
        <ResumoFinanceiro />

        {/* Últimas despesas cadastradas */}
        <DespesasRecentes />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    padding: 20,
  },

  // Espaço no fim da rolagem
  conteudo: {
    paddingBottom: 30,
  },

  // Cabeçalho
  header: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 30,
    position: "relative",
    zIndex: 10,
    elevation: 10,
  },

  // Título centralizado
  titulo: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#10B981",
    letterSpacing: -0.5,
    textAlign: "center",
  },

  // Aplicado quando a fonte Poppins termina de carregar
  tituloFonte: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "normal",
  },
});
