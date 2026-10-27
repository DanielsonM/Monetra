import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { totalDespesas } from "../database/dbGestor/dbDespesas";
import { totalSaldoPorTipo } from "../database/dbGestor/dbSaldos";

// Formata valores para Real brasileiro
const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

// Card clicável: tocar no card abre a consulta; tocar no "+" abre o cadastro
type CardResumoProps = {
  titulo: string;
  valor: number;
  rotaConsulta: string;
  rotaCadastro: string;
  cor: string;
};

function CardResumo({
  titulo,
  valor,
  rotaConsulta,
  rotaCadastro,
  cor,
}: CardResumoProps) {
  return (
    <TouchableOpacity
      style={styles.cardInfo}
      activeOpacity={0.8}
      onPress={() => router.push(rotaConsulta as never)}
    >
      <View style={styles.linhaTopo}>
        <Text style={styles.label}>{titulo}</Text>

        {/* Atalho para cadastrar um novo item */}
        <TouchableOpacity
          onPress={() => router.push(rotaCadastro as never)}
          hitSlop={12}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={28} color={cor} />
        </TouchableOpacity>
      </View>

      <Text style={styles.infoValor}>{formatarMoeda(valor)}</Text>
    </TouchableOpacity>
  );
}

export default function ResumoFinanceiro() {
  const [salarioMensal, setSalarioMensal] = useState(0);
  const [despesasTotais, setDespesasTotais] = useState(0);

  // Atualiza os valores sempre que a tela volta a ficar em foco
  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      Promise.all([totalSaldoPorTipo("Salário"), totalDespesas()])
        .then(([salario, despesas]) => {
          if (ativo) {
            setSalarioMensal(salario);
            setDespesasTotais(despesas);
          }
        })
        .catch((erro) => console.error(erro));

      return () => {
        ativo = false;
      };
    }, [])
  );

  return (
    <View>
      <CardResumo
        titulo="Meu dinheiro"
        valor={salarioMensal}
        rotaConsulta="/consultas/conSaldo"
        rotaCadastro="/cadastros/cadSaldo"
        cor="#00897B"
      />

      <CardResumo
        titulo="Despesas totais"
        valor={despesasTotais}
        rotaConsulta="/consultas/conDespesa"
        rotaCadastro="/cadastros/cadDespesas"
        cor="#D32F2F"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Cards de informações
  cardInfo: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  linhaTopo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  label: {
    fontSize: 16,
    color: "#666666",
  },

  infoValor: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 8,
    color: "#1A1A1A",
  },
});
