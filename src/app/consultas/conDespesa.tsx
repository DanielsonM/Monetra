import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  type Despesa,
  excluirDespesa,
  listarDespesas,
  registrarPagamentoDespesa,
  totalDespesasPagas,
} from "../../database/dbGestor/dbDespesas";
import { totalReceitasRecebidas } from "../../database/dbGestor/dbReceitas";
import { dataISOparaBR } from "../../utils/converterData";
import InfoButton from "../../components/infoButton";
import CardParcelamento from "../../components/cardParcelamento";
import NavegadorMes, { chaveMesAtual } from "../../components/navegadorMes";
import CardResumoRetratil from "../../components/cardResumoRetratil";
import { listarTags, lerTags, type Tag } from "../../database/dbGestor/dbTags";

// Formata valores para Real brasileiro
const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type ItemListaDespesa =
  | { chave: string; natureza: "despesa"; despesa: Despesa }
  | { chave: string; natureza: "grupo"; grupoId: number; despesas: Despesa[] };

export default function ConDespesa() {
  const router = useRouter();
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [buscarNome, setBuscarNome] = useState(true);
  const [buscarTipo, setBuscarTipo] = useState(false);
  const [tipoSelecionado, setTipoSelecionado] = useState("Todos");
  const [tiposAbertos, setTiposAbertos] = useState(false);
  const [despesaPagamento, setDespesaPagamento] = useState<Despesa | null>(null);
  const [valorParcial, setValorParcial] = useState("");
  const [salvandoPagamento, setSalvandoPagamento] = useState(false);
  const [gruposAbertos, setGruposAbertos] = useState<Record<number, boolean>>({});
  const [modoSelecao, setModoSelecao] = useState(false);
  const [despesasSelecionadas, setDespesasSelecionadas] = useState<number[]>([]);
  const [mesSelecionado, setMesSelecionado] = useState(chaveMesAtual());

  useEffect(() => {
    let mesAtualObservado = chaveMesAtual();
    const intervalo = setInterval(() => {
      const atual = chaveMesAtual();
      if (atual !== mesAtualObservado) {
        const anterior = mesAtualObservado;
        mesAtualObservado = atual;
        setMesSelecionado((selecionado) => selecionado === anterior ? atual : selecionado);
      }
    }, 60_000);
    return () => clearInterval(intervalo);
  }, []);

  const despesasDoMes = despesas.filter((d) => d.provisao.startsWith(mesSelecionado));

  const tiposDisponiveis = [
    "Todos",
    ...Array.from(new Set(despesasDoMes.map((despesa) => despesa.tipo))).sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    ),
  ];
  const despesasFiltradas = despesasDoMes.filter((d) => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    const nomeCorresponde = !buscarNome || !termo || d.nome.toLocaleLowerCase("pt-BR").includes(termo);
    const tipoCorresponde = !buscarTipo || tipoSelecionado === "Todos" || d.tipo === tipoSelecionado;
    return nomeCorresponde && tipoCorresponde;
  });
  const placeholderBusca = buscarNome && buscarTipo
    ? "Buscar por nome ou tipo"
    : buscarNome
      ? "Buscar por nome"
      : buscarTipo
        ? "Selecione um tipo"
        : "Busca desativada";

  const totalPago = despesasDoMes.reduce((soma, d) => soma + (d.pago ? d.valor : d.valor_pago ?? 0), 0);
  const totalPendente = despesasDoMes.reduce((soma, d) => soma + (d.pago ? 0 : Math.max(0, d.valor - (d.valor_pago ?? 0))), 0);
  const total = totalPago + totalPendente;
  const totalSelecionado = despesasDoMes
    .filter((despesa) => despesasSelecionadas.includes(despesa.id))
    .reduce((soma, despesa) => soma + despesa.valor, 0);
  const totalBusca = despesasFiltradas.reduce((soma, d) => soma + d.valor, 0);
  const pesquisaAtiva = (buscarNome && Boolean(busca.trim())) || (buscarTipo && tipoSelecionado !== "Todos");

  const itensLista: ItemListaDespesa[] = [];
  const gruposAdicionados = new Set<number>();
  const despesasPorGrupo = new Map<number, Despesa[]>();
  for (const despesa of despesasDoMes) {
    if (!despesa.grupo_parcelas_id) continue;
    const grupo = despesasPorGrupo.get(despesa.grupo_parcelas_id) ?? [];
    grupo.push(despesa);
    despesasPorGrupo.set(despesa.grupo_parcelas_id, grupo);
  }
  for (const despesa of despesasFiltradas) {
    if (despesa.grupo_parcelas_id) {
      if (gruposAdicionados.has(despesa.grupo_parcelas_id)) continue;
      gruposAdicionados.add(despesa.grupo_parcelas_id);
      const integrantes = (despesasPorGrupo.get(despesa.grupo_parcelas_id) ?? [])
        .sort((a, b) => a.numero_parcela - b.numero_parcela);
      itensLista.push({ chave: `g${despesa.grupo_parcelas_id}`, natureza: "grupo", grupoId: despesa.grupo_parcelas_id, despesas: integrantes });
    } else {
      itensLista.push({ chave: `d${despesa.id}`, natureza: "despesa", despesa });
    }
  }

  const voltar = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/home/home");
    }
  };

  // Abre o cadastro vazio, para uma nova despesa
  const adicionar = () => {
    router.push("/cadastros/cadDespesas" as never);
  };

  const unificar = () => {
    router.push("/consultas/unificarDespesas" as never);
  };

  // Abre o cadastro em modo edição, com os dados da despesa carregados
  const editar = (despesa: Despesa) => {
    router.push({
      pathname: "/cadastros/cadDespesas",
      params: { id: String(despesa.id) },
    } as never);
  };

  const alternarSelecao = (despesa: Despesa) => {
    setDespesasSelecionadas((selecionadas) => selecionadas.includes(despesa.id)
      ? selecionadas.filter((id) => id !== despesa.id)
      : [...selecionadas, despesa.id]);
  };

  const carregar = useCallback(async () => {
    try {
      const [listaDespesas, listaTags] = await Promise.all([listarDespesas(), listarTags()]);
      setDespesas(listaDespesas);
      setTags(listaTags);
    } catch (erro) {
      console.error(erro);
      Alert.alert("Erro", "Não foi possível carregar as despesas.");
    } finally {
      setCarregando(false);
    }
  }, []);

  // Recarrega sempre que a tela volta a ficar em foco
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const confirmarExclusao = (despesa: Despesa) => {
    Alert.alert(
      "Excluir despesa",
      `Deseja excluir "${despesa.nome}" (${formatarMoeda(despesa.valor)})?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await excluirDespesa(despesa.id);
              await carregar();
            } catch (erro) {
              console.error(erro);
              Alert.alert("Erro", "Não foi possível excluir a despesa.");
            }
          },
        },
      ]
    );
  };

  const iniciarPagamento = async (despesa: Despesa) => {
    try {
      const [entradas, saidas] = await Promise.all([
        totalReceitasRecebidas(),
        totalDespesasPagas(),
      ]);
      const saldoDisponivel = entradas - saidas;
      if (saldoDisponivel <= 0.005) {
        Alert.alert("Sem saldo disponível", "Não há saldo disponível para realizar o pagamento.");
        return;
      }
      setDespesaPagamento(despesa);
      setValorParcial("");
    } catch (erro) {
      console.error(erro);
      Alert.alert("Erro", "Não foi possível consultar o saldo disponível.");
    }
  };

  const renderDespesa = (item: Despesa, compacta = false) => (
    <TouchableOpacity
      style={compacta ? styles.itemGrupo : styles.card}
      activeOpacity={0.8}
      onPress={() => modoSelecao ? alternarSelecao(item) : editar(item)}
      accessibilityRole="button"
      accessibilityState={modoSelecao ? { selected: despesasSelecionadas.includes(item.id) } : undefined}
    >
      <View style={styles.cardInfo}>
        <Text style={styles.nome}>{item.nome}</Text>
        <Text style={styles.detalhe}>
          {item.tipo} · Emissão {dataISOparaBR(item.data_emissao)} · Provisão {dataISOparaBR(item.provisao)}
        </Text>
        {lerTags(item.tags_ids).length > 0 && <Text style={styles.detalheTags}>{lerTags(item.tags_ids).map((id) => tags.find((tag) => tag.id === id)?.nome).filter(Boolean).join(" · ")}</Text>}
        {item.grupo_parcelas_id && <Text style={styles.detalheParcela}>Parcela {item.numero_parcela} de {item.parcelas}</Text>}
        {!item.pago && (item.valor_pago ?? 0) > 0 && (
          <Text style={styles.detalhePago}>Pago {formatarMoeda(item.valor_pago)} · Restante {formatarMoeda(Math.max(0, item.valor - item.valor_pago))}</Text>
        )}
      </View>

      <View style={styles.cardDireita}>
        {modoSelecao && <View style={styles.seletorDespesa}>
          <Ionicons name={despesasSelecionadas.includes(item.id) ? "checkbox" : "square-outline"} size={24} color="#00897B" />
        </View>}
        <Text style={styles.valor}>{formatarMoeda(item.pago ? item.valor : Math.max(0, item.valor - (item.valor_pago ?? 0)))}</Text>
        {!item.pago && Math.max(0, item.valor - (item.valor_pago ?? 0)) > 0.01 && (
          <TouchableOpacity
            style={styles.botaoParcial}
            onPress={() => { void iniciarPagamento(item); }}
            hitSlop={8}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Pagar despesa ${item.nome}`}
          >
            <Ionicons name="cash-outline" size={17} color="#00897B" />
            <Text style={styles.botaoParcialTexto}>Pagar</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => confirmarExclusao(item)}
          hitSlop={10}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={20} color="#D32F2F" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: ItemListaDespesa }) => {
    if (item.natureza === "despesa") return renderDespesa(item.despesa);
    const primeiro = item.despesas[0];
    const totalGrupo = item.despesas.reduce((soma, despesa) => soma + despesa.valor, 0);
    const pagas = item.despesas.filter((despesa) => despesa.pago === 1).length;
    return (
      <CardParcelamento
        nome={primeiro?.nome ?? "Parcelamento"}
        tipo={primeiro?.tipo ?? "Despesa"}
        total={totalGrupo}
        quantidade={item.despesas.length}
        pagas={pagas}
        natureza="despesa"
        aberto={Boolean(gruposAbertos[item.grupoId])}
        onPress={() => setGruposAbertos((atual) => ({ ...atual, [item.grupoId]: !atual[item.grupoId] }))}
      >
        {item.despesas.map((despesa) => <View key={despesa.id}>{renderDespesa(despesa, true)}</View>)}
      </CardParcelamento>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabeçalho com botão de voltar */}
      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={voltar} hitSlop={10} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={28} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Despesas</Text>
        <InfoButton compacto titulo="Consulta de despesas" texto="Veja as despesas cadastradas, suas provisões e status de pagamento. Em despesas pendentes, use Pagar para registrar um valor parcial ou quitar o saldo restante; o app confere o saldo disponível e mantém a despesa pendente até a quitação. O botão + cria uma nova despesa. Em Unificar despesas não pagas, escolha a despesa que continuará e a que será somada. A operação fica em Históricos > Unificações." />
      </View>

      {/* Resumo mensal com navegação entre meses */}
      <CardResumoRetratil>
      <View style={styles.resumo}>
        <View style={styles.resumoTopo}>
          <Text style={styles.resumoLabel}>
            Despesas pagas ({despesasDoMes.filter((d) => d.pago === 1).length})
          </Text>
        </View>
        <NavegadorMes mes={mesSelecionado} onChange={setMesSelecionado} />
        <Text style={styles.resumoValor}>{formatarMoeda(totalPago)}</Text>
        <Text style={styles.resumoDetalhe}>Faltam pagar: {formatarMoeda(totalPendente)}</Text>
        <Text style={styles.resumoDetalhe}>Total de despesas no mês: {formatarMoeda(total)}</Text>
        <View style={styles.linhaAdicionar}>
          <TouchableOpacity onPress={adicionar} hitSlop={12} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Adicionar despesa">
            <Ionicons name="add-circle-outline" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.botaoUnificar} onPress={unificar} activeOpacity={0.8}>
          <Ionicons name="git-compare-outline" size={18} color="#FFFFFF" />
          <Text style={styles.botaoUnificarTexto}>Unificar despesas não pagas</Text>
        </TouchableOpacity>
      </View>
      </CardResumoRetratil>

      <View style={styles.linhaBusca}>
        <TextInput style={[styles.busca, !buscarNome && styles.buscaDesativada]} value={busca} onChangeText={setBusca} placeholder={placeholderBusca} editable={buscarNome} returnKeyType="search" accessibilityLabel={placeholderBusca} />
        {pesquisaAtiva && <View style={styles.somaBusca} accessibilityLabel={`Soma dos resultados: ${formatarMoeda(totalBusca)}`}><Text style={styles.somaBuscaLabel}>Soma</Text><Text style={styles.somaBuscaValor} numberOfLines={1} adjustsFontSizeToFit>{formatarMoeda(totalBusca)}</Text></View>}
      </View>
      <View style={styles.linhaSelecao}>
        <TouchableOpacity
          style={[styles.botaoSelecao, modoSelecao && styles.botaoSelecaoAtivo]}
          onPress={() => {
            setModoSelecao((ativo) => !ativo);
            setDespesasSelecionadas([]);
          }}
          accessibilityRole="button"
          accessibilityState={{ selected: modoSelecao }}
        >
          <Ionicons name={modoSelecao ? "close-circle-outline" : "checkbox-outline"} size={18} color={modoSelecao ? "#FFFFFF" : "#00796B"} />
          <Text style={[styles.botaoSelecaoTexto, modoSelecao && styles.botaoSelecaoTextoAtivo]}>{modoSelecao ? "Concluir seleção" : "Selecionar despesas"}</Text>
        </TouchableOpacity>
        {modoSelecao && <View style={styles.totalSelecionado} accessibilityLabel={`Total selecionado: ${formatarMoeda(totalSelecionado)}`}>
          <Text style={styles.totalSelecionadoLabel}>{despesasDoMes.filter((despesa) => despesasSelecionadas.includes(despesa.id)).length} selecionada(s)</Text>
          <Text style={styles.totalSelecionadoValor}>{formatarMoeda(totalSelecionado)}</Text>
        </View>}
      </View>
      <View style={styles.opcoesBusca}>
        <View style={styles.opcaoBusca}><Text style={styles.opcaoBuscaTexto}>Nome</Text><Switch value={buscarNome} onValueChange={(ativo) => { setBuscarNome(ativo); if (ativo) { setBuscarTipo(false); setTiposAbertos(false); } setBusca(""); }} trackColor={{ false: "#D0D0D0", true: "#80CBC4" }} thumbColor={buscarNome ? "#00897B" : "#F4F4F4"} accessibilityLabel="Buscar por nome" /></View>
        <View style={styles.opcaoBusca}><Text style={styles.opcaoBuscaTexto}>Tipo</Text><Switch value={buscarTipo} onValueChange={(ativo) => { setBuscarTipo(ativo); if (ativo) { setBuscarNome(false); setTipoSelecionado("Todos"); } setBusca(""); setTiposAbertos(false); }} trackColor={{ false: "#D0D0D0", true: "#80CBC4" }} thumbColor={buscarTipo ? "#00897B" : "#F4F4F4"} accessibilityLabel="Buscar por tipo" /></View>
      </View>
      {buscarTipo && <View style={styles.seletorTipoContainer}>
        <TouchableOpacity style={styles.seletorTipo} onPress={() => setTiposAbertos((aberto) => !aberto)} accessibilityRole="button" accessibilityLabel={`Tipo selecionado: ${tipoSelecionado}`} accessibilityState={{ expanded: tiposAbertos }}>
          <Text style={styles.seletorTipoTexto} numberOfLines={1}>{tipoSelecionado}</Text>
          <Ionicons name={tiposAbertos ? "chevron-up" : "chevron-down"} size={18} color="#00897B" />
        </TouchableOpacity>
        {tiposAbertos && <ScrollView style={styles.listaTipos} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {tiposDisponiveis.map((tipo) => <TouchableOpacity key={tipo} style={[styles.opcaoTipo, tipoSelecionado === tipo && styles.opcaoTipoAtiva]} onPress={() => { setTipoSelecionado(tipo); setTiposAbertos(false); }} accessibilityRole="button" accessibilityState={{ selected: tipoSelecionado === tipo }}>
            <Text style={[styles.opcaoTipoTexto, tipoSelecionado === tipo && styles.opcaoTipoTextoAtiva]}>{tipo}</Text>
          </TouchableOpacity>)}
        </ScrollView>}
      </View>}

      <FlatList
        data={itensLista}
        keyExtractor={(item) => item.chave}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          carregando ? null : (
            <View style={styles.vazio}>
              <Ionicons name="receipt-outline" size={48} color="#BBBBBB" />
              <Text style={styles.vazioTexto}>{busca.trim() || (buscarTipo && tipoSelecionado !== "Todos") ? "Nenhuma despesa encontrada" : "Nenhuma despesa cadastrada"}</Text>
            </View>
          )
        }
      />
      <Modal transparent visible={despesaPagamento !== null} animationType="fade" onRequestClose={() => setDespesaPagamento(null)}>
        <KeyboardAvoidingView style={styles.modalFundo} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDespesaPagamento(null)} />
          <View style={styles.modalCartao}>
            <Text style={styles.modalTitulo}>Pagar despesa</Text>
            <Text style={styles.modalDescricao} numberOfLines={2}>{despesaPagamento?.nome}</Text>
            <Text style={styles.modalPendente}>Saldo pendente: {formatarMoeda(Math.max(0, (despesaPagamento?.valor ?? 0) - (despesaPagamento?.valor_pago ?? 0)))}</Text>
            <TouchableOpacity style={styles.botaoValorTotal} onPress={() => {
              const pendente = Math.max(0, (despesaPagamento?.valor ?? 0) - (despesaPagamento?.valor_pago ?? 0));
              setValorParcial(formatarEntradaMoeda(String(Math.round(pendente * 100))));
            }} accessibilityRole="button" accessibilityLabel="Preencher o saldo total pendente">
              <Text style={styles.botaoValorTotalTexto}>Preencher saldo total</Text>
            </TouchableOpacity>
            <Text style={styles.modalLabel}>Valor a pagar</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="0,00"
              keyboardType="number-pad"
              value={valorParcial}
              onChangeText={(texto) => setValorParcial(formatarEntradaMoeda(texto))}
              autoFocus
            />
            <Text style={styles.modalAjuda}>O valor será descontado do saldo disponível e do restante desta despesa.</Text>
            <View style={styles.modalAcoes}>
              <TouchableOpacity style={styles.modalCancelar} onPress={() => setDespesaPagamento(null)} disabled={salvandoPagamento}>
                <Text style={styles.modalCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmar} disabled={salvandoPagamento} onPress={async () => {
                if (!despesaPagamento) return;
                const valor = numeroMoeda(valorParcial);
                try {
                  setSalvandoPagamento(true);
                  await registrarPagamentoDespesa(despesaPagamento.id, valor);
                  setDespesaPagamento(null);
                  await carregar();
                } catch (erro) {
                  const mensagem = erro instanceof Error ? erro.message : "Não foi possível registrar o pagamento.";
                  Alert.alert(mensagem.includes("Saldo disponível insuficiente") ? "Saldo insuficiente" : "Pagamento não realizado", mensagem);
                } finally {
                  setSalvandoPagamento(false);
                }
              }}>
                <Text style={styles.modalConfirmarTexto}>{salvandoPagamento ? "Salvando..." : "Confirmar pagamento"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 20 },

  // Cabeçalho com seta de voltar
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  titulo: { fontSize: 28, fontWeight: "bold", color: "#1A1A1A" },
  linhaBusca: { flexDirection: "row", alignItems: "stretch", gap: 8, marginBottom: 12 },
  linhaSelecao: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 },
  botaoSelecao: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#E0F2F1" },
  botaoSelecaoAtivo: { backgroundColor: "#00897B" },
  botaoSelecaoTexto: { color: "#00796B", fontSize: 13, fontWeight: "600" },
  botaoSelecaoTextoAtivo: { color: "#FFFFFF" },
  totalSelecionado: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, backgroundColor: "#FFFFFF", borderRadius: 10, paddingHorizontal: 12, minHeight: 40 },
  totalSelecionadoLabel: { color: "#666666", fontSize: 12 },
  totalSelecionadoValor: { color: "#1A1A1A", fontSize: 15, fontWeight: "bold" },
  busca: { flex: 1, minWidth: 0, backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: "#1A1A1A" },
  buscaDesativada: { color: "#888888" },
  somaBusca: { width: 124, justifyContent: "center", backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 10, borderWidth: 1, borderColor: "#E0E0E0" },
  somaBuscaLabel: { fontSize: 11, color: "#777777" },
  somaBuscaValor: { fontSize: 13, fontWeight: "bold", color: "#1A1A1A", marginTop: 2 },
  opcoesBusca: { flexDirection: "row", gap: 12, marginBottom: 12 },
  opcaoBusca: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  opcaoBuscaTexto: { fontSize: 14, color: "#1A1A1A" },
  seletorTipoContainer: { marginBottom: 12, zIndex: 2 },
  seletorTipo: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: "#D7E8E4" },
  seletorTipoTexto: { flex: 1, color: "#1A1A1A", fontSize: 15 },
  listaTipos: { maxHeight: 180, backgroundColor: "#FFFFFF", borderRadius: 12, marginTop: 4, borderWidth: 1, borderColor: "#E0E0E0", elevation: 4 },
  opcaoTipo: { minHeight: 44, justifyContent: "center", paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#EEEEEE" },
  opcaoTipoAtiva: { backgroundColor: "#E8F5F2" },
  opcaoTipoTexto: { fontSize: 14, color: "#333333" },
  opcaoTipoTextoAtiva: { color: "#00796B", fontWeight: "bold" },

  // Resumo com o total
  resumo: {
    backgroundColor: "#D32F2F",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,

    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  resumoTopo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resumoLabel: { fontSize: 14, color: "#FFEBEE" },
  resumoValor: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 4,
  },
  resumoDetalhe: { fontSize: 13, color: "#FFEBEE", marginTop: 4 },
  linhaAdicionar: { alignItems: "flex-end", marginTop: 4 },
  botaoUnificar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#B71C1C", borderRadius: 10, paddingVertical: 11, marginTop: 14 },
  botaoUnificarTexto: { color: "#FFFFFF", fontSize: 14, fontWeight: "bold" },

  // Lista
  lista: { paddingBottom: 20, flexGrow: 1 },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardInfo: { flex: 1, marginRight: 12 },
  nome: { fontSize: 17, fontWeight: "bold", color: "#1A1A1A" },
  detalhe: { fontSize: 13, color: "#666666", marginTop: 4 },
  cardDireita: { alignItems: "flex-end", gap: 10 },
  seletorDespesa: { padding: 2 },
  itemGrupo: { paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E7E7E7", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  valor: { fontSize: 17, fontWeight: "bold", color: "#1A1A1A" },
  botaoParcial: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#E0F2F1", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  botaoParcialTexto: { color: "#00796B", fontSize: 11, fontWeight: "bold" },
  detalhePago: { fontSize: 11, color: "#777777", marginTop: 4 },
  detalheTags: { fontSize: 12, color: "#00796B", marginTop: 4 },
  detalheParcela: { fontSize: 12, color: "#00897B", fontWeight: "600", marginTop: 3 },

  modalFundo: { flex: 1, backgroundColor: "rgba(0,0,0,0.42)", justifyContent: "center", padding: 22 },
  modalCartao: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 20, elevation: 8 },
  modalTitulo: { fontSize: 20, fontWeight: "bold", color: "#1A1A1A" },
  modalDescricao: { fontSize: 15, color: "#555555", marginTop: 7 },
  modalPendente: { fontSize: 14, fontWeight: "600", color: "#D32F2F", marginTop: 12 },
  botaoValorTotal: { alignSelf: "flex-start", marginTop: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#E0F2F1" },
  botaoValorTotalTexto: { color: "#00796B", fontSize: 13, fontWeight: "600" },
  modalLabel: { fontSize: 13, color: "#666666", marginTop: 16, marginBottom: 6 },
  modalInput: { backgroundColor: "#F7F7F7", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, color: "#1A1A1A" },
  modalAjuda: { fontSize: 12, lineHeight: 17, color: "#777777", marginTop: 9 },
  modalAcoes: { flexDirection: "row", gap: 9, marginTop: 20 },
  modalCancelar: { minHeight: 46, paddingHorizontal: 14, justifyContent: "center", borderRadius: 10, backgroundColor: "#EEEEEE" },
  modalCancelarTexto: { color: "#444444", fontWeight: "600" },
  modalConfirmar: { flex: 1, minHeight: 46, paddingHorizontal: 12, justifyContent: "center", alignItems: "center", borderRadius: 10, backgroundColor: "#00897B" },
  modalConfirmarTexto: { color: "#FFFFFF", fontSize: 13, fontWeight: "bold" },

  // Lista vazia
  vazio: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  vazioTexto: { fontSize: 16, color: "#999999" },
});

const formatarEntradaMoeda = (texto: string) => {
  const digitos = texto.replace(/\D/g, "").replace(/^0+/, "");
  if (!digitos) return "";
  const preenchido = digitos.padStart(3, "0");
  return `${preenchido.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${preenchido.slice(-2)}`;
};

const numeroMoeda = (texto: string) => parseFloat(texto.replace(/\./g, "").replace(",", "."));
