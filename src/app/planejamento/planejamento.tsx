import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InfoButton from "../../components/infoButton";
import {
  planejamentoDoMes,
  type PlanejamentoMes,
} from "../../database/dbGestor/dbHistorico";
import {
  listarOrcamentos,
  salvarOrcamento,
  type OrcamentoCategoria,
} from "../../database/dbGestor/dbOrcamentos";

const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const mesAtual = () => {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
};

function mudarMes(mes: string, delta: number) {
  const [ano, numeroMes] = mes.split("-").map(Number);
  const novaData = new Date(ano, numeroMes - 1 + delta, 1);
  return `${novaData.getFullYear()}-${String(novaData.getMonth() + 1).padStart(2, "0")}`;
}

function nomeDoMes(mes: string) {
  const [ano, numeroMes] = mes.split("-").map(Number);
  const nome = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(ano, numeroMes - 1, 1));
  return nome.charAt(0).toLocaleUpperCase("pt-BR") + nome.slice(1);
}

export default function Planejamento() {
  const router = useRouter();
  const [mes, setMes] = useState(mesAtual);
  const [dados, setDados] = useState<PlanejamentoMes | null>(null);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [tentativa, setTentativa] = useState(0);
  const [orcamentos, setOrcamentos] = useState<OrcamentoCategoria[]>([]);
  const [modalOrcamento, setModalOrcamento] = useState(false);
  const [tipoOrcamento, setTipoOrcamento] = useState("");
  const [limiteOrcamento, setLimiteOrcamento] = useState("");
  const [salvandoOrcamento, setSalvandoOrcamento] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      setErro(false);
      setCarregando(true);
      setDados(null);
      planejamentoDoMes(mes)
        .then((resultado) => {
          if (ativo) {
            setDados(resultado);
            setCarregando(false);
          }
        })
        .catch((e) => {
          console.error(e);
          if (ativo) {
            setErro(true);
            setCarregando(false);
          }
        });
      listarOrcamentos()
        .then((resultado) => {
          if (ativo) setOrcamentos(resultado);
        })
        .catch((e) => console.error(e));

      return () => {
        ativo = false;
      };
      // `tentativa` dispara uma nova leitura quando o usuário toca em "Tentar novamente".
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mes, tentativa])
  );

  const voltar = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/home/home");
  };

  const receitasTotais =
    (dados?.receitasRecebidas ?? 0) + (dados?.receitasAReceber ?? 0);
  const despesasTotais =
    (dados?.despesasPagas ?? 0) + (dados?.despesasAPagar ?? 0);
  const resultado = receitasTotais - despesasTotais;
  const percentualGasto =
    receitasTotais > 0 ? (despesasTotais / receitasTotais) * 100 : 0;
  const percentualBarra = Math.min(100, Math.max(0, percentualGasto));
  const maiorCategoria = Math.max(1, ...(dados?.categorias.map((c) => c.total) ?? []));
  const categorias = useMemo(() => {
    const porTipo = new Map((dados?.categorias ?? []).map((c) => [c.tipo, c]));
    for (const orcamento of orcamentos) {
      if (!porTipo.has(orcamento.tipo)) {
        porTipo.set(orcamento.tipo, { tipo: orcamento.tipo, pago: 0, pendente: 0, total: 0 });
      }
    }
    return [...porTipo.values()].sort((a, b) => b.total - a.total);
  }, [dados?.categorias, orcamentos]);
  const salarioTotal = (dados?.salarioRecebido ?? 0) + (dados?.salarioAReceber ?? 0);
  const livreDoSalario = salarioTotal - despesasTotais;

  const abrirOrcamento = (tipo = "") => {
    setTipoOrcamento(tipo);
    setLimiteOrcamento(
      tipo ? String(orcamentos.find((item) => item.tipo === tipo)?.limite ?? "") : ""
    );
    setModalOrcamento(true);
  };

  const gravarOrcamento = async () => {
    const tipo = tipoOrcamento.trim();
    const limite = Number(limiteOrcamento.replace(",", "."));
    if (!tipo || !Number.isFinite(limite) || limite <= 0) {
      Alert.alert("Verifique os dados", "Informe uma categoria e um limite mensal maior que zero.");
      return;
    }
    try {
      setSalvandoOrcamento(true);
      await salvarOrcamento(tipo, limite);
      setOrcamentos(await listarOrcamentos());
      setModalOrcamento(false);
    } catch (e) {
      console.error(e);
      Alert.alert("Não foi possível salvar", "Tente novamente.");
    } finally {
      setSalvandoOrcamento(false);
    }
  };

  const removerOrcamento = (tipo: string) => {
    Alert.alert("Remover limite?", `O limite de ${tipo} será removido.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: async () => {
        await salvarOrcamento(tipo, 0);
        setOrcamentos(await listarOrcamentos());
      } },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={voltar} hitSlop={10} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={28} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Planejamento</Text>
        <InfoButton
          compacto
          titulo="Planejamento mensal"
          texto="A previsão soma receitas já recebidas e a receber no mês, depois desconta despesas pagas e contas pendentes com vencimento nesse mês. Ela mostra quanto sobra se as receitas previstas entrarem e as contas forem pagas. Não inclui dinheiro guardado de meses anteriores."
        />
      </View>

      <View style={styles.seletorMes}>
        <TouchableOpacity
          style={styles.setaMes}
          onPress={() => setMes((atual) => mudarMes(atual, -1))}
          hitSlop={8}
          accessibilityLabel="Mês anterior"
        >
          <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.nomeMes}>{nomeDoMes(mes)}</Text>
        <TouchableOpacity
          style={styles.setaMes}
          onPress={() => setMes((atual) => mudarMes(atual, 1))}
          hitSlop={8}
          accessibilityLabel="Próximo mês"
        >
          <Ionicons name="chevron-forward" size={22} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.conteudo}
      >
        <View
          style={[
            styles.resultadoCard,
            { backgroundColor: resultado >= 0 ? "#2E7D32" : "#D32F2F" },
          ]}
        >
          <Text style={styles.resultadoRotulo}>Resultado previsto do mês</Text>
          <Text style={styles.resultadoValor}>{formatarMoeda(resultado)}</Text>
          <Text style={styles.resultadoAjuda}>
            {resultado >= 0
              ? "É o que deve sobrar depois das entradas e despesas previstas."
              : "As despesas previstas passam das receitas deste mês."}
          </Text>
        </View>

        <View style={styles.cartao}>
          <View style={styles.tituloCartaoLinha}>
            <View style={[styles.iconeResumo, { backgroundColor: "#E8F5E9" }]}>
              <Ionicons name="trending-up-outline" size={20} color="#2E7D32" />
            </View>
            <Text style={styles.tituloCartao}>Entradas do mês</Text>
            <Text style={[styles.totalCartao, { color: "#2E7D32" }]}>
              {formatarMoeda(receitasTotais)}
            </Text>
          </View>
          <LinhaValor
            rotulo="Já recebidas"
            valor={dados?.receitasRecebidas ?? 0}
            cor="#2E7D32"
          />
          <LinhaValor
            rotulo="A receber"
            valor={dados?.receitasAReceber ?? 0}
            cor="#1976D2"
          />
        </View>

        <View style={styles.cartao}>
          <View style={styles.tituloCartaoLinha}>
            <View style={[styles.iconeResumo, { backgroundColor: "#FFEBEE" }]}>
              <Ionicons name="trending-down-outline" size={20} color="#D32F2F" />
            </View>
            <Text style={styles.tituloCartao}>Gastos do mês</Text>
            <Text style={[styles.totalCartao, { color: "#D32F2F" }]}>
              {formatarMoeda(despesasTotais)}
            </Text>
          </View>
          <LinhaValor
            rotulo="Já pagos"
            valor={dados?.despesasPagas ?? 0}
            cor="#D32F2F"
          />
          <LinhaValor
            rotulo="Pendentes"
            valor={dados?.despesasAPagar ?? 0}
            cor="#F57C00"
          />
        </View>

        <View style={styles.cartao}>
          <Text style={styles.tituloCartao}>Quanto da renda será gasto?</Text>
          <Text style={styles.percentualTexto}>
            {receitasTotais > 0
              ? `${Math.round(percentualGasto)}% das entradas previstas`
              : "Cadastre receitas para ver a proporção dos gastos"}
          </Text>
          <View style={styles.trilho}>
            <View
              style={[
                styles.progresso,
                {
                  width: `${percentualBarra}%` as `${number}%`,
                  backgroundColor: percentualGasto > 100 ? "#D32F2F" : "#F57C00",
                },
              ]}
            />
          </View>
          {percentualGasto > 100 && (
            <Text style={styles.alertaTexto}>
              Os gastos previstos superam as entradas em {formatarMoeda(-resultado)}.
            </Text>
          )}
        </View>

        <View style={styles.cartao}>
          <View style={styles.tituloCartaoLinha}>
            <View style={[styles.iconeResumo, { backgroundColor: "#E0F2F1" }]}>
              <Ionicons name="wallet-outline" size={20} color="#00897B" />
            </View>
            <Text style={styles.tituloCartao}>Salário comprometido</Text>
          </View>
          <Text style={styles.subtituloCartao}>
            Quanto do salário deste mês já foi consumido ou está reservado para contas.
          </Text>
          <LinhaValor rotulo="Salário recebido" valor={dados?.salarioRecebido ?? 0} cor="#2E7D32" />
          <LinhaValor rotulo="Salário a receber" valor={dados?.salarioAReceber ?? 0} cor="#1976D2" />
          <LinhaValor rotulo="Gastos pagos e pendentes" valor={despesasTotais} cor="#D32F2F" />
          <View style={styles.livreLinha}>
            <Text style={styles.livreRotulo}>Livre após as despesas</Text>
            <Text style={[styles.livreValor, { color: livreDoSalario >= 0 ? "#2E7D32" : "#D32F2F" }]}>
              {formatarMoeda(livreDoSalario)}
            </Text>
          </View>
          {livreDoSalario < 0 && (
            <Text style={styles.alertaTexto}>As despesas previstas passam do salário em {formatarMoeda(-livreDoSalario)}.</Text>
          )}
        </View>

        <View style={styles.cartao}>
          <Text style={styles.tituloCartao}>Gastos por tipo</Text>
          <Text style={styles.subtituloCartao}>
            Compare os gastos previstos com o limite mensal de cada categoria.
          </Text>
          <TouchableOpacity style={styles.botaoLimite} onPress={() => abrirOrcamento()} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={19} color="#00897B" />
            <Text style={styles.botaoLimiteTexto}>Definir limite por categoria</Text>
          </TouchableOpacity>

          {erro ? (
            <Text style={styles.vazio}>Não foi possível carregar o planejamento.</Text>
          ) : dados && categorias.length === 0 ? (
            <Text style={styles.vazio}>Nenhum gasto registrado para este mês.</Text>
          ) : (
            categorias.map((categoria) => {
              const limite = orcamentos.find((item) => item.tipo === categoria.tipo)?.limite;
              const percentual = limite ? (categoria.total / limite) * 100 : 0;
              const corLimite = percentual >= 100 ? "#D32F2F" : percentual >= 80 ? "#F57C00" : "#2E7D32";
              return (
              <View key={categoria.tipo} style={styles.categoria}>
                <View style={styles.categoriaTopo}>
                  <Text style={styles.nomeCategoria}>{categoria.tipo}</Text>
                  <Text style={styles.valorCategoria}>
                    {formatarMoeda(categoria.total)}
                  </Text>
                </View>
                <View style={styles.trilhoCategoria}>
                  <View
                    style={[
                      limite ? styles.barraLimite : styles.barraCategoria,
                      { width: `${limite ? Math.min(100, percentual) : (categoria.total / maiorCategoria) * 100}%` as `${number}%`, backgroundColor: limite ? corLimite : undefined },
                    ]}
                  />
                </View>
                <Text style={styles.detalheCategoria}>
                  {formatarMoeda(categoria.pago)} pagos · {formatarMoeda(categoria.pendente)} pendentes
                </Text>
                {limite ? (
                  <View style={styles.limiteRodape}>
                    <Text style={[styles.detalheCategoria, { color: corLimite }]}>
                      {percentual >= 100 ? `Limite excedido em ${formatarMoeda(categoria.total - limite)}` : percentual >= 80 ? `Atenção: ${Math.round(percentual)}% do limite de ${formatarMoeda(limite)}` : `${Math.round(percentual)}% do limite de ${formatarMoeda(limite)}`}
                    </Text>
                    <TouchableOpacity onPress={() => abrirOrcamento(categoria.tipo)} hitSlop={8}>
                      <Text style={styles.editarLimite}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removerOrcamento(categoria.tipo)} hitSlop={8}>
                      <Text style={styles.removerLimite}>Remover</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => abrirOrcamento(categoria.tipo)} hitSlop={8}>
                    <Text style={styles.editarLimite}>Definir limite mensal</Text>
                  </TouchableOpacity>
                )}
              </View>
            );})
          )}
        </View>

        {carregando && <Text style={styles.carregando}>Calculando planejamento...</Text>}

        {erro && (
          <TouchableOpacity
            style={styles.botaoRecarregar}
            onPress={() => setTentativa((numero) => numero + 1)}
            activeOpacity={0.8}
          >
            <Text style={styles.botaoRecarregarTexto}>Tentar novamente</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.nota}>
          A previsão usa receitas recebidas ou a receber no mês e despesas pagas ou pendentes com vencimento no mês. Não inclui saldo acumulado de meses anteriores.
        </Text>
      </ScrollView>
      <Modal visible={modalOrcamento} transparent animationType="slide" onRequestClose={() => setModalOrcamento(false)}>
        <View style={styles.modalFundo}>
          <View style={styles.modalCartao}>
            <Text style={styles.tituloCartao}>{orcamentos.some((o) => o.tipo === tipoOrcamento) ? "Editar limite mensal" : "Novo limite mensal"}</Text>
            <Text style={styles.rotuloCampo}>Categoria</Text>
            <TextInput value={tipoOrcamento} onChangeText={setTipoOrcamento} placeholder="Ex.: Alimentação" style={styles.campo} autoCapitalize="sentences" />
            <Text style={styles.rotuloCampo}>Limite por mês</Text>
            <TextInput value={limiteOrcamento} onChangeText={setLimiteOrcamento} placeholder="Ex.: 800" style={styles.campo} keyboardType="decimal-pad" />
            <Text style={styles.dicaCampo}>Use o mesmo nome da categoria cadastrada nas despesas para acompanhar os gastos corretamente.</Text>
            <View style={styles.acoesModal}>
              <TouchableOpacity onPress={() => setModalOrcamento(false)} style={styles.acaoSecundaria}><Text style={styles.acaoSecundariaTexto}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity onPress={gravarOrcamento} disabled={salvandoOrcamento} style={styles.acaoPrimaria}><Text style={styles.acaoPrimariaTexto}>{salvandoOrcamento ? "Salvando..." : "Salvar limite"}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function LinhaValor({
  rotulo,
  valor,
  cor,
}: {
  rotulo: string;
  valor: number;
  cor: string;
}) {
  return (
    <View style={styles.linhaValor}>
      <Text style={styles.rotuloLinha}>{rotulo}</Text>
      <Text style={[styles.valorLinha, { color: cor }]}>{formatarMoeda(valor)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 20 },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  titulo: { flex: 1, fontSize: 27, fontWeight: "bold", color: "#1A1A1A" },
  seletorMes: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  setaMes: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  nomeMes: { fontSize: 20, fontWeight: "bold", color: "#1A1A1A" },
  conteudo: { paddingBottom: 28 },
  resultadoCard: {
    borderRadius: 22,
    padding: 22,
    marginBottom: 14,
    alignItems: "center",
    elevation: 4,
  },
  resultadoRotulo: { fontSize: 15, color: "#FFFFFF", opacity: 0.9 },
  resultadoValor: { fontSize: 32, fontWeight: "bold", color: "#FFFFFF", marginTop: 4 },
  resultadoAjuda: {
    color: "#FFFFFF",
    opacity: 0.9,
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  cartao: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 17,
    marginBottom: 14,
    elevation: 2,
  },
  tituloCartaoLinha: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 8 },
  iconeResumo: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  tituloCartao: { flex: 1, fontSize: 16, fontWeight: "bold", color: "#1A1A1A" },
  totalCartao: { fontSize: 15, fontWeight: "bold" },
  linhaValor: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
  },
  rotuloLinha: { fontSize: 14, color: "#666666" },
  valorLinha: { fontSize: 15, fontWeight: "bold" },
  livreLinha: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#EEEEEE", marginTop: 12, paddingTop: 12 },
  livreRotulo: { fontSize: 14, fontWeight: "bold", color: "#333333" },
  livreValor: { fontSize: 16, fontWeight: "bold" },
  percentualTexto: { fontSize: 13, color: "#666666", marginTop: 6, marginBottom: 10 },
  trilho: { height: 10, borderRadius: 5, backgroundColor: "#EEEEEE", overflow: "hidden" },
  progresso: { height: 10, borderRadius: 5 },
  alertaTexto: { fontSize: 13, color: "#B71C1C", marginTop: 10, fontWeight: "bold" },
  subtituloCartao: { fontSize: 12, color: "#888888", marginTop: 4, marginBottom: 4 },
  categoria: { marginTop: 14 },
  categoriaTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  nomeCategoria: { fontSize: 14, fontWeight: "bold", color: "#1A1A1A" },
  valorCategoria: { fontSize: 14, fontWeight: "bold", color: "#D32F2F" },
  trilhoCategoria: { height: 7, borderRadius: 4, backgroundColor: "#EEEEEE", overflow: "hidden", marginTop: 7 },
  barraCategoria: { height: 7, borderRadius: 4, backgroundColor: "#F57C00" },
  barraLimite: { height: 7, borderRadius: 4 },
  limiteRodape: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 },
  editarLimite: { fontSize: 12, color: "#00897B", fontWeight: "bold", marginTop: 6 },
  removerLimite: { fontSize: 12, color: "#B71C1C", fontWeight: "bold", marginTop: 6 },
  botaoLimite: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 10 },
  botaoLimiteTexto: { color: "#00897B", fontWeight: "bold", fontSize: 13 },
  modalFundo: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 20 },
  modalCartao: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 20, elevation: 8 },
  rotuloCampo: { fontSize: 13, color: "#555555", fontWeight: "600", marginTop: 14, marginBottom: 5 },
  campo: { borderWidth: 1, borderColor: "#DDDDDD", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16, color: "#1A1A1A" },
  dicaCampo: { fontSize: 12, color: "#777777", lineHeight: 17, marginTop: 10 },
  acoesModal: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 20 },
  acaoSecundaria: { paddingHorizontal: 14, paddingVertical: 11 },
  acaoSecundariaTexto: { color: "#666666", fontWeight: "bold" },
  acaoPrimaria: { backgroundColor: "#00897B", borderRadius: 10, paddingHorizontal: 15, paddingVertical: 11 },
  acaoPrimariaTexto: { color: "#FFFFFF", fontWeight: "bold" },
  detalheCategoria: { fontSize: 11, color: "#777777", marginTop: 5 },
  vazio: { fontSize: 14, color: "#888888", textAlign: "center", paddingVertical: 18 },
  carregando: { textAlign: "center", color: "#888888", fontSize: 13, marginBottom: 8 },
  nota: { fontSize: 12, lineHeight: 18, color: "#888888", marginHorizontal: 3, marginTop: 2 },
  botaoRecarregar: { alignItems: "center", marginBottom: 12, padding: 12 },
  botaoRecarregarTexto: { color: "#00897B", fontSize: 15, fontWeight: "bold" },
});
