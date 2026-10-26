import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  type Despesa,
  listarRecentes,
  pagarDespesa,
  renovarPendentes,
} from "../database/dbGestor/dbDespesas";
import { dataISOparaBR, somarUmMes } from "../utils/converterData";

type NomeIcone = keyof typeof Ionicons.glyphMap;

// Ícone e cor de cada tipo de despesa
const ICONES: Record<string, { nome: NomeIcone; cor: string }> = {
  Aluguel: { nome: "home-outline", cor: "#1565C0" },
  Condomínio: { nome: "business-outline", cor: "#5D4037" },
  Água: { nome: "water-outline", cor: "#0288D1" },
  Energia: { nome: "bulb-outline", cor: "#2E7D32" },
  Internet: { nome: "wifi-outline", cor: "#6A1B9A" },
  Telefone: { nome: "call-outline", cor: "#00897B" },
  Empréstimo: { nome: "cash-outline", cor: "#455A64" },
  Financiamento: { nome: "cash-outline", cor: "#37474F" },
  "Cartão de Crédito": { nome: "card-outline", cor: "#1A237E" },
  Seguro: { nome: "shield-checkmark-outline", cor: "#00695C" },
  IPVA: { nome: "car-outline", cor: "#E64A19" },
  IPTU: { nome: "business-outline", cor: "#6D4C41" },
  Combustível: { nome: "speedometer-outline", cor: "#C62828" },
  Transporte: { nome: "bus-outline", cor: "#F57C00" },
  Supermercado: { nome: "cart-outline", cor: "#388E3C" },
  Alimentação: { nome: "restaurant-outline", cor: "#D84315" },
  Farmácia: { nome: "medkit-outline", cor: "#D32F2F" },
  Saúde: { nome: "heart-outline", cor: "#C2185B" },
  Academia: { nome: "barbell-outline", cor: "#512DA8" },
  Educação: { nome: "school-outline", cor: "#1976D2" },
  "Mensalidade Escolar": { nome: "book-outline", cor: "#0277BD" },
  Streaming: { nome: "tv-outline", cor: "#AD1457" },
  Lazer: { nome: "game-controller-outline", cor: "#7B1FA2" },
  Viagem: { nome: "airplane-outline", cor: "#0097A7" },
  Manutenção: { nome: "construct-outline", cor: "#757575" },
  Investimento: { nome: "trending-up-outline", cor: "#2E7D32" },
  Impostos: { nome: "document-text-outline", cor: "#546E7A" },
  "Salário Funcionário": { nome: "people-outline", cor: "#3949AB" },
  Outros: { nome: "ellipsis-horizontal-circle-outline", cor: "#757575" },
};

const ICONE_PADRAO = { nome: "pricetag-outline" as NomeIcone, cor: "#757575" };

const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Quantos dias passaram do vencimento (negativo = ainda não venceu)
function diasVencidos(iso: string) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const vencimento = new Date(ano, mes - 1, dia);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((hoje.getTime() - vencimento.getTime()) / 86400000);
}

type Status = {
  texto: string;
  icone: NomeIcone;
  corIcone: string;
  corTexto: string;
  negrito: boolean;
};

function calcularStatus(d: Despesa): Status {
  if (d.pago) {
    return {
      texto: "Pago",
      icone: "checkmark-circle",
      corIcone: "#4CAF50",
      corTexto: "#1A1A1A",
      negrito: false,
    };
  }

  const dias = diasVencidos(d.vencimento);
  if (dias > 0) {
    return {
      texto: `${dias} ${dias === 1 ? "dia" : "dias"} vencido`,
      icone: "warning",
      corIcone: "#F9A825",
      corTexto: "#8A5A00",
      negrito: true,
    };
  }

  return {
    texto: "Não Pago",
    icone: "close-circle",
    corIcone: "#D32F2F",
    corTexto: "#B71C1C",
    negrito: true,
  };
}

export default function DespesasRecentes() {
  const [despesas, setDespesas] = useState<Despesa[]>([]);

  const carregar = useCallback(async () => {
  try {
    await renovarPendentes();
    setDespesas(await listarRecentes(5));
  } catch (erro) {
    console.error(erro);
  }
}, []);

  // Recarrega sempre que a Home volta a ficar em foco
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  // Toque no card: confirma e alterna entre pago / não pago
  // Toque no card: confirma o pagamento e avança o vencimento em um mês
const confirmarPagamento = (d: Despesa) => {
  const proximo = dataISOparaBR(somarUmMes(d.vencimento));

  Alert.alert(
    "Marcar como paga",
    `Confirmar o pagamento de "${d.nome}"?\n\nO próximo vencimento será ${proximo}.`,
    [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Confirmar",
        onPress: async () => {
          try {
            await pagarDespesa(d.id);
            await carregar();
          } catch (erro) {
            console.error(erro);
            Alert.alert("Erro", "Não foi possível atualizar a despesa.");
          }
        },
      },
    ]
  );
};

  return (
    <View style={styles.secao}>
      <Text style={styles.titulo}>Despesas Recentes</Text>

      {despesas.length === 0 && (
        <Text style={styles.vazio}>Nenhuma despesa para exibir</Text>
      )}

      {despesas.map((d) => {
        const icone = ICONES[d.tipo] ?? ICONE_PADRAO;
        const status = calcularStatus(d);

        return (
       <TouchableOpacity
            key={d.id}
            style={styles.card}
            onPress={() => confirmarPagamento(d)}
            disabled={!!d.pago}
            activeOpacity={0.8}
          >
                    
            <View style={[styles.circulo, { backgroundColor: icone.cor }]}>
              <Ionicons name={icone.nome} size={26} color="#FFFFFF" />
            </View>

            <View style={styles.centro}>
              <Text style={styles.nome} numberOfLines={1}>
                {d.nome}
              </Text>

              <View style={styles.linhaStatus}>
                <Text style={styles.vencimento}>
                  Vencimento: {dataISOparaBR(d.vencimento).slice(0, 5)} ·
                </Text>
                <Ionicons
                  name={status.icone}
                  size={18}
                  color={status.corIcone}
                />
                <Text
                  style={[
                    styles.statusTexto,
                    {
                      color: status.corTexto,
                      fontWeight: status.negrito ? "bold" : "normal",
                    },
                  ]}
                >
                  {status.texto}
                </Text>
              </View>
            </View>

            <Text style={styles.valor}>{formatarMoeda(d.valor)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  secao: { marginBottom: 5 },

  titulo: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginBottom: 12,
  },

  vazio: { fontSize: 15, color: "#999999", marginBottom: 12 },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,

    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  circulo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },

  centro: { flex: 1 },

  nome: { fontSize: 18, fontWeight: "bold", color: "#1A1A2E" },

  linhaStatus: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },

  vencimento: { fontSize: 13, color: "#555555" },
  statusTexto: { fontSize: 13 },

  valor: { fontSize: 17, fontWeight: "bold", color: "#1A1A2E" },
});