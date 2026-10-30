import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  listarLancamentosRecentes,
  type LancamentoRecente,
  type NaturezaRecente,
} from "../database/dbGestor/dbRecentes";
import { dataISOparaBR } from "../utils/converterData";
import InfoButton from "./infoButton";

type NomeIcone = keyof typeof Ionicons.glyphMap;

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
  Salário: { nome: "cash-outline", cor: "#2E7D32" },
  "Renda extra": { nome: "add-circle-outline", cor: "#00897B" },
  Rendimentos: { nome: "trending-up-outline", cor: "#1976D2" },
  Outros: { nome: "ellipsis-horizontal-circle-outline", cor: "#757575" },
};

const ICONE_PADRAO = { nome: "pricetag-outline" as NomeIcone, cor: "#757575" };
type Filtro = "todas" | NaturezaRecente;
const FILTROS: { chave: Filtro; rotulo: string }[] = [
  { chave: "receita", rotulo: "Receitas" },
  { chave: "despesa", rotulo: "Despesas" },
];

const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const hojeISO = () => {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
};

function statusDoLancamento(item: LancamentoRecente) {
  if (item.liquidado) {
    return item.natureza === "receita"
      ? { texto: "Recebida", icone: "checkmark-circle" as NomeIcone, cor: "#2E7D32" }
      : { texto: "Pago", icone: "checkmark-circle" as NomeIcone, cor: "#2E7D32" };
  }

  const vencido = item.vencimento < hojeISO();
  if (vencido) {
    return { texto: "Vencida", icone: "warning" as NomeIcone, cor: "#B71C1C" };
  }

  return item.natureza === "receita"
    ? { texto: "A receber", icone: "time-outline" as NomeIcone, cor: "#F57C00" }
    : { texto: "Não Pago", icone: "close-circle" as NomeIcone, cor: "#B71C1C" };
}

export default function LancamentosRecentes() {
  const [lancamentos, setLancamentos] = useState<LancamentoRecente[]>([]);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("todas");

  const carregar = useCallback(async () => {
    try {
      setCarregando(true);
      setLancamentos(
        await listarLancamentosRecentes(3, filtro === "todas" ? undefined : filtro)
      );
    } catch (erro) {
      console.error(erro);
    } finally {
      setCarregando(false);
    }
  }, [filtro]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  return (
    <View style={styles.secao}>
      <View style={styles.cardSecao}>
        <TouchableOpacity
          style={[styles.cabecalho, aberto && styles.cabecalhoAberto]}
          onPress={() => setAberto((valor) => !valor)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ expanded: aberto }}
        >
          <View style={styles.tituloLinha}>
            <Text style={styles.titulo}>Lançamentos Recentes</Text>
            <InfoButton
              compacto
              titulo="Lançamentos recentes"
              texto="Exibe os três lançamentos cadastrados mais recentemente em cada filtro. Os cards são apenas informativos: toque no cabeçalho para abrir ou fechar a lista. Use Provisão para registrar pagamentos e recebimentos."
            />
          </View>
          <View style={styles.cabecalhoDireita}>
            {!aberto && lancamentos.length > 0 && (
              <Text style={styles.resumoFechado}>
                {lancamentos.length} {lancamentos.length === 1 ? "item" : "itens"}
              </Text>
            )}
            <Ionicons
              name={aberto ? "chevron-down" : "chevron-forward"}
              size={24}
              color="#666666"
            />
          </View>
        </TouchableOpacity>

        {aberto && (
          <View style={styles.lista}>
            <View style={styles.abas}>
              {FILTROS.map((opcao) => {
                const ativa = filtro === opcao.chave;
                return (
                  <TouchableOpacity
                    key={opcao.chave}
                    style={[styles.aba, ativa && styles.abaAtiva]}
                    onPress={() =>
                      setFiltro((atual) =>
                        atual === opcao.chave ? "todas" : opcao.chave
                      )
                    }
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ selected: ativa }}
                    accessibilityHint="Toque novamente no filtro selecionado para mostrar receitas e despesas."
                  >
                    <Text style={[styles.abaTexto, ativa && styles.abaTextoAtiva]}>
                      {opcao.rotulo}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {lancamentos.map((item) => {
              const icone = ICONES[item.tipo] ?? ICONE_PADRAO;
              const status = statusDoLancamento(item);
              const receita = item.natureza === "receita";

              return (
                <View key={`${item.natureza}-${item.id}`} style={styles.cardItem}>
                  <View style={[styles.circulo, { backgroundColor: icone.cor }]}>
                    <Ionicons name={icone.nome} size={26} color="#FFFFFF" />
                  </View>

                  <View style={styles.centro}>
                    <Text style={styles.nome} numberOfLines={1}>
                      {item.nome}
                    </Text>
                    <Text style={styles.tipo} numberOfLines={1}>
                      {receita ? "Receita" : "Despesa"} · {item.tipo}
                    </Text>
                    <View style={styles.linhaStatus}>
                      <Text style={styles.data}>
                        {receita
                          ? `Entrada: ${dataISOparaBR(item.data)} · Venc.: ${dataISOparaBR(item.vencimento)} ·`
                          : `Vencimento: ${dataISOparaBR(item.vencimento)} ·`}
                      </Text>
                      <Ionicons name={status.icone} size={16} color={status.cor} />
                      <Text style={[styles.statusTexto, { color: status.cor }]}>
                        {status.texto}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.valor, receita && styles.valorReceita]}>
                    {formatarMoeda(item.valor)}
                  </Text>
                </View>
              );
            })}

            {!carregando && lancamentos.length === 0 && (
              <Text style={styles.vazio}>
                {filtro === "todas"
                  ? "Nenhum lançamento cadastrado"
                  : filtro === "receita"
                    ? "Nenhuma receita cadastrada"
                    : "Nenhuma despesa cadastrada"}
              </Text>
            )}
            {carregando && (
              <Text style={styles.vazio}>Carregando lançamentos...</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  secao: { marginBottom: 5 },
  cardSecao: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cabecalhoAberto: { marginBottom: 12 },
  tituloLinha: { flexDirection: "row", alignItems: "center", gap: 4 },
  titulo: { fontSize: 18, fontWeight: "bold", color: "#1A1A1A" },
  cabecalhoDireita: { flexDirection: "row", alignItems: "center", gap: 8 },
  resumoFechado: { fontSize: 14, fontWeight: "bold", color: "#666666" },
  lista: { gap: 0 },
  abas: { flexDirection: "row", gap: 8, marginBottom: 12 },
  aba: {
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  abaAtiva: { backgroundColor: "#10B981" },
  abaTexto: { fontSize: 13, color: "#1A1A1A" },
  abaTextoAtiva: { color: "#FFFFFF", fontWeight: "bold" },
  cardItem: {
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
  centro: { flex: 1, minWidth: 0 },
  nome: { fontSize: 18, fontWeight: "bold", color: "#1A1A2E" },
  tipo: { fontSize: 13, color: "#666666", marginTop: 2 },
  linhaStatus: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  data: { fontSize: 12, color: "#555555" },
  statusTexto: { fontSize: 12, fontWeight: "bold" },
  valor: { fontSize: 15, fontWeight: "bold", color: "#1A1A2E" },
  valorReceita: { color: "#2E7D32" },
  vazio: { fontSize: 14, color: "#999999", textAlign: "center", paddingVertical: 16 },
});
