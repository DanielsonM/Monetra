import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  type Despesa,
  listarDespesas,
  pagarDespesa,
} from "../database/dbGestor/dbDespesas";
import {
  listarReceitas,
  receberReceita,
  type Receita,
} from "../database/dbGestor/dbReceitas";
import { sincronizarNotificacoes } from "../services/notificacoes";
import { dataISOparaBR } from "../utils/converterData";

// Quantos itens aparecem na lista antes de "Ver todas"
const LIMITE = 5;

type Aba = "todas" | "areceber" | "apagar";

const ABAS: { chave: Aba; rotulo: string }[] = [
  { chave: "todas", rotulo: "Todas" },
  { chave: "areceber", rotulo: "A receber" },
  { chave: "apagar", rotulo: "A pagar" },
];

// Item da lista de provisões (receita a receber ou despesa a pagar)
type Item = {
  chave: string;
  id: number;
  tipo: "receita" | "despesa";
  nome: string;
  valor: number;
  vencimento: string; // AAAA-MM-DD
};

// Formata valores para Real brasileiro
const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Data de hoje no horário local (AAAA-MM-DD). Não usa toISOString, que
// converte para UTC e pode mudar o dia dependendo do horário
const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const somar = (itens: { valor: number }[]) =>
  itens.reduce((soma, i) => soma + i.valor, 0);

type ProvisaoProps = {
  // Chamado depois de liquidar um item, para a Home atualizar os outros cards
  aoLiquidar?: () => void;
};

export default function Provisao({ aoLiquidar }: ProvisaoProps) {
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [aba, setAba] = useState<Aba>("todas");
  const [verTodas, setVerTodas] = useState(false);
  const [aberto, setAberto] = useState(false); // começa fechado

  const carregar = useCallback(async () => {
    try {
      const [r, d] = await Promise.all([listarReceitas(), listarDespesas()]);
      setReceitas(r);
      setDespesas(d);
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

  const hoje = hojeISO();

  // Realizado (regime de caixa): receitas recebidas - despesas pagas
  const receitasRecebidas = receitas.filter((r) => r.recebido === 1);
  const despesasPagas = despesas.filter((d) => d.pago === 1);
  const caixaAtual = somar(receitasRecebidas) - somar(despesasPagas);

  // Provisionado (ainda não liquidado)
  const receitasPendentes = receitas.filter((r) => r.recebido === 0);
  const despesasPendentes = despesas.filter((d) => d.pago === 0);
  const aReceber = somar(receitasPendentes);
  const aPagar = somar(despesasPendentes);

  // Saldo projetado = caixa atual + a receber - a pagar
  const saldoProjetado = caixaAtual + aReceber - aPagar;
  const projetadoNegativo = saldoProjetado < 0;

  const receberVencidas = receitasPendentes.filter(
    (r) => r.vencimento < hoje
  ).length;
  const pagarVencidas = despesasPendentes.filter(
    (d) => d.vencimento < hoje
  ).length;

  // Lista unificada, do vencimento mais próximo (ou mais atrasado) ao mais distante
  const itens: Item[] = [
    ...receitasPendentes.map<Item>((r) => ({
      chave: `r${r.id}`,
      id: r.id,
      tipo: "receita",
      nome: r.nome,
      valor: r.valor,
      vencimento: r.vencimento,
    })),
    ...despesasPendentes.map<Item>((d) => ({
      chave: `d${d.id}`,
      id: d.id,
      tipo: "despesa",
      nome: d.nome,
      valor: d.valor,
      vencimento: d.vencimento,
    })),
  ].sort((a, b) => a.vencimento.localeCompare(b.vencimento));

  const filtrados = itens.filter((i) =>
    aba === "todas"
      ? true
      : aba === "areceber"
        ? i.tipo === "receita"
        : i.tipo === "despesa"
  );
  const visiveis = verTodas ? filtrados : filtrados.slice(0, LIMITE);

  // Liquida o item: receita vira "recebida", despesa vira "paga"
  const liquidar = (item: Item) => {
    const receita = item.tipo === "receita";

    Alert.alert(
      receita ? "Confirmar recebimento" : "Confirmar pagamento",
      `${receita ? "Receber" : "Pagar"} "${item.nome}" (${formatarMoeda(item.valor)})?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: receita ? "Receber" : "Pagar",
          onPress: async () => {
            try {
              if (receita) {
                await receberReceita(item.id);
              } else {
                await pagarDespesa(item.id);
                await sincronizarNotificacoes();
              }

              await carregar();
              aoLiquidar?.();
            } catch (erro) {
              console.error(erro);
              Alert.alert("Erro", "Não foi possível concluir a baixa.");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.card}>
      {/* Cabeçalho: tocar abre/fecha. Seta para a direita = fechado, para baixo = aberto */}
      <TouchableOpacity
        style={[styles.cabecalho, aberto && styles.cabecalhoAberto]}
        onPress={() => setAberto(!aberto)}
        activeOpacity={0.7}
      >
        <Text style={styles.titulo}>Provisão</Text>

        <View style={styles.cabecalhoDireita}>
          {/* Fechado: mostra só o saldo projetado como resumo */}
          {!aberto && (
            <Text
              style={[
                styles.resumoFechado,
                { color: projetadoNegativo ? "#D32F2F" : "#2E7D32" },
              ]}
            >
              {formatarMoeda(saldoProjetado)}
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
        <>
      {/* Relatório: realizado, provisionado e projeção */}
      <LinhaValor rotulo="Saldo em caixa" valor={caixaAtual} />

      <LinhaValor
        rotulo="(+) A receber"
        valor={aReceber}
        cor="#2E7D32"
        detalhe={
          receberVencidas > 0
            ? `${receberVencidas} vencida${receberVencidas > 1 ? "s" : ""}`
            : undefined
        }
      />

      <LinhaValor
        rotulo="(−) A pagar"
        valor={aPagar}
        cor="#D32F2F"
        detalhe={
          pagarVencidas > 0
            ? `${pagarVencidas} vencida${pagarVencidas > 1 ? "s" : ""}`
            : undefined
        }
      />

      <View style={styles.divisor} />

      <View style={styles.linhaProjetado}>
        <Text style={styles.rotuloProjetado}>Saldo projetado</Text>
        <Text
          style={[
            styles.valorProjetado,
            { color: projetadoNegativo ? "#D32F2F" : "#2E7D32" },
          ]}
        >
          {formatarMoeda(saldoProjetado)}
        </Text>
      </View>

      {/* Pendências: tocar no botão da direita liquida o item */}
      <View style={styles.abas}>
        {ABAS.map((a) => {
          const ativa = aba === a.chave;

          return (
            <TouchableOpacity
              key={a.chave}
              style={[styles.aba, ativa && styles.abaAtiva]}
              onPress={() => {
                setAba(a.chave);
                setVerTodas(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.abaTexto, ativa && styles.abaTextoAtiva]}>
                {a.rotulo}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {visiveis.length === 0 ? (
        <Text style={styles.vazio}>Nenhuma pendência</Text>
      ) : (
        visiveis.map((item) => {
          const receita = item.tipo === "receita";
          const vencida = item.vencimento < hoje;
          const cor = receita ? "#2E7D32" : "#D32F2F";

          return (
            <View key={item.chave} style={styles.item}>
              <View style={[styles.indicador, { backgroundColor: cor }]} />

              <View style={styles.itemInfo}>
                <Text style={styles.itemNome} numberOfLines={1}>
                  {item.nome}
                </Text>
                <Text
                  style={[styles.itemData, vencida && styles.itemDataVencida]}
                >
                  {vencida ? "Vencida em " : "Vence em "}
                  {dataISOparaBR(item.vencimento)}
                </Text>
              </View>

              <Text style={[styles.itemValor, { color: cor }]}>
                {receita ? "+ " : "− "}
                {formatarMoeda(item.valor)}
              </Text>

              <TouchableOpacity
                style={[styles.botaoBaixa, { borderColor: cor }]}
                onPress={() => liquidar(item)}
                hitSlop={6}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark" size={18} color={cor} />
              </TouchableOpacity>
            </View>
          );
        })
      )}

      {filtrados.length > LIMITE && (
        <TouchableOpacity
          onPress={() => setVerTodas(!verTodas)}
          activeOpacity={0.7}
          style={styles.verMais}
        >
          <Text style={styles.verMaisTexto}>
            {verTodas ? "Ver menos" : `Ver todas (${filtrados.length})`}
          </Text>
        </TouchableOpacity>
      )}
        </>
      )}
    </View>
  );
}

// Linha do relatório (rótulo à esquerda, valor à direita)
type LinhaValorProps = {
  rotulo: string;
  valor: number;
  cor?: string;
  detalhe?: string;
};

function LinhaValor({ rotulo, valor, cor = "#1A1A1A", detalhe }: LinhaValorProps) {
  return (
    <View style={styles.linha}>
      <View>
        <Text style={styles.rotulo}>{rotulo}</Text>
        {detalhe ? <Text style={styles.detalheVencida}>{detalhe}</Text> : null}
      </View>
      <Text style={[styles.valor, { color: cor }]}>{formatarMoeda(valor)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
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

  // Cabeçalho que abre/fecha o componente
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cabecalhoAberto: { marginBottom: 12 },
  cabecalhoDireita: { flexDirection: "row", alignItems: "center", gap: 8 },
  resumoFechado: { fontSize: 15, fontWeight: "bold" },

  titulo: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1A",
  },

  // Relatório
  linha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  rotulo: { fontSize: 15, color: "#666666" },
  detalheVencida: { fontSize: 12, color: "#D32F2F", marginTop: 2 },
  valor: { fontSize: 16, fontWeight: "bold" },

  divisor: { height: 1, backgroundColor: "#EEEEEE", marginVertical: 8 },

  linhaProjetado: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  rotuloProjetado: { fontSize: 16, fontWeight: "bold", color: "#1A1A1A" },
  valorProjetado: { fontSize: 20, fontWeight: "bold" },

  // Abas da lista
  abas: { flexDirection: "row", gap: 8, marginTop: 16, marginBottom: 6 },
  aba: {
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  abaAtiva: { backgroundColor: "#10B981" },
  abaTexto: { fontSize: 13, color: "#1A1A1A" },
  abaTextoAtiva: { color: "#FFFFFF", fontWeight: "bold" },

  // Itens
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  indicador: { width: 4, height: 34, borderRadius: 2 },
  itemInfo: { flex: 1 },
  itemNome: { fontSize: 15, fontWeight: "bold", color: "#1A1A1A" },
  itemData: { fontSize: 12, color: "#666666", marginTop: 2 },
  itemDataVencida: { color: "#D32F2F" },
  itemValor: { fontSize: 14, fontWeight: "bold" },
  botaoBaixa: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },

  vazio: {
    fontSize: 14,
    color: "#999999",
    textAlign: "center",
    paddingVertical: 16,
  },

  verMais: { alignItems: "center", paddingTop: 12 },
  verMaisTexto: { fontSize: 14, color: "#10B981", fontWeight: "bold" },
});