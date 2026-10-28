import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { totalDespesas } from "../database/dbGestor/dbDespesas";
import { totalReceitasRecebidas } from "../database/dbGestor/dbReceitas";

// Formata valores para Real brasileiro
const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ConCard() {
  const [somaReceitas, setSomaReceitas] = useState(0);
  const [somaDespesas, setSomaDespesas] = useState(0);

  // Recarrega sempre que a Home volta a ficar em foco (ex.: depois de cadastrar)
  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      (async () => {
        try {
          const [receitas, despesas] = await Promise.all([
            totalReceitasRecebidas(),
            totalDespesas(),
          ]);
          if (ativo) {
            setSomaReceitas(receitas);
            setSomaDespesas(despesas);
          }
        } catch (erro) {
          console.error(erro);
        }
      })();

      return () => {
        ativo = false;
      };
    }, [])
  );

  // Saldo disponível = receitas já recebidas - total de despesas
  const saldoDisponivel = somaReceitas - somaDespesas;
  const saldoNegativo = saldoDisponivel < 0;

  return (
    <View
      style={[
        styles.cardSaldo,
        { backgroundColor: saldoNegativo ? "#D32F2F" : "#2E7D32" },
      ]}
    >
      <Text style={styles.labelSaldo}>Saldo disponível</Text>

      <Text style={styles.valor}>{formatarMoeda(saldoDisponivel)}</Text>

      <Text style={styles.status}>
        {saldoNegativo ? "Saldo negativo" : "Vai sobrar"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardSaldo: {
    height: 180,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25,
    padding: 20,

    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },

  labelSaldo: {
    fontSize: 16,
    color: "#E8F5E9",
    marginBottom: 8,
  },

  valor: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#FFFFFF",
  },

  status: {
    fontSize: 18,
    marginTop: 10,
    color: "#FFFFFF",
  },
});