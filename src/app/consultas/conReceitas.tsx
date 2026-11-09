import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InfoButton from "../../components/infoButton";
import {
  excluirReceita,
  listarReceitas,
  receberReceita,
  type Receita,
} from "../../database/dbGestor/dbReceitas";
import { dataISOparaBR } from "../../utils/converterData";
import { listarBancos, type Banco } from "../../database/dbGestor/dbBancos";
import { ModalSeletorBanco } from "../../components/seletorBanco";
import CardParcelamento from "../../components/cardParcelamento";
import NavegadorMes, { chaveMesAtual } from "../../components/navegadorMes";
import CardResumoRetratil from "../../components/cardResumoRetratil";
import { listarTags, lerTags, type Tag } from "../../database/dbGestor/dbTags";

// Situação de cada receita:
// - recebida: já foi recebida (entra no saldo disponível)
// - vencida: não foi recebida e o vencimento já passou
// - areceber: não foi recebida e ainda está no prazo (vence hoje ou depois)
type StatusReceita = "recebida" | "areceber" | "vencida";
type Filtro = "todas" | "recebidas" | "areceber" | "vencidas";

const FILTROS: { chave: Filtro; rotulo: string }[] = [
  { chave: "todas", rotulo: "Todas" },
  { chave: "recebidas", rotulo: "Recebidas" },
  { chave: "areceber", rotulo: "A receber" },
  { chave: "vencidas", rotulo: "Vencidas" },
];

const STATUS_DO_FILTRO: Record<Exclude<Filtro, "todas">, StatusReceita> = {
  recebidas: "recebida",
  areceber: "areceber",
  vencidas: "vencida",
};

const TEXTO_STATUS: Record<StatusReceita, string> = {
  recebida: "Recebida",
  areceber: "A receber",
  vencida: "Vencida",
};

const MENSAGEM_VAZIO: Record<Filtro, string> = {
  todas: "Nenhuma receita cadastrada",
  recebidas: "Nenhuma receita recebida",
  areceber: "Nenhuma receita a receber",
  vencidas: "Nenhuma receita vencida",
};

// Formata valores para Real brasileiro
const formatarReal = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type ItemListaReceita =
  | { chave: string; natureza: "receita"; receita: Receita }
  | { chave: string; natureza: "grupo"; grupoId: number; receitas: Receita[] };

// Data de hoje no horário local (AAAA-MM-DD). Não usa toISOString, que
// converte para UTC e pode mudar o dia dependendo do horário
const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Define a situação da receita (datas em AAAA-MM-DD comparam bem como texto)
const statusDe = (r: Receita, hoje: string): StatusReceita => {
  if (r.recebido === 1) return "recebida";
  return r.vencimento < hoje ? "vencida" : "areceber";
};

export default function ConReceita() {
  const router = useRouter();

  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busca, setBusca] = useState("");
  const [buscarNome, setBuscarNome] = useState(true);
  const [buscarTipo, setBuscarTipo] = useState(false);
  const [tipoSelecionado, setTipoSelecionado] = useState("Todos");
  const [tiposAbertos, setTiposAbertos] = useState(false);
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [receitaParaReceber, setReceitaParaReceber] = useState<Receita | null>(null);
  const [gruposAbertos, setGruposAbertos] = useState<Record<number, boolean>>({});
  const [modoSelecao, setModoSelecao] = useState(false);
  const [receitasSelecionadas, setReceitasSelecionadas] = useState<number[]>([]);
  const [mesSelecionado, setMesSelecionado] = useState(chaveMesAtual());

  const hoje = hojeISO();
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

  const receitasDoMes = receitas.filter((r) => (r.recebido === 1 ? (r.data_recebimento ?? r.vencimento) : r.vencimento).startsWith(mesSelecionado));
  const totalRecebido = receitasDoMes.reduce((soma, r) => r.recebido === 1 ? soma + r.valor : soma, 0);
  const totalAReceber = receitasDoMes.reduce((soma, r) => r.recebido === 0 ? soma + r.valor : soma, 0);
  const total = totalRecebido + totalAReceber;
  const totalSelecionado = receitasDoMes
    .filter((receita) => receitasSelecionadas.includes(receita.id))
    .reduce((soma, receita) => soma + receita.valor, 0);

  // Quantidade de receitas em cada filtro
  const contagem: Record<Filtro, number> = {
    todas: receitasDoMes.length,
    recebidas: 0,
    areceber: 0,
    vencidas: 0,
  };
  for (const r of receitasDoMes) {
    const status = statusDe(r, hoje);
    if (status === "recebida") contagem.recebidas++;
    else if (status === "vencida") contagem.vencidas++;
    else contagem.areceber++;
  }

  // Lista exibida de acordo com o filtro escolhido
  const porStatus =
    filtro === "todas"
      ? receitasDoMes
      : receitasDoMes.filter(
          (r) => statusDe(r, hoje) === STATUS_DO_FILTRO[filtro]
        );
  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  const tiposDisponiveis = [
    "Todos",
    ...Array.from(new Set(receitasDoMes.map((receita) => receita.tipo))).sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    ),
  ];
  const filtradas = porStatus.filter((r) => {
    const nomeCorresponde = !buscarNome || !termo || r.nome.toLocaleLowerCase("pt-BR").includes(termo);
    const tipoCorresponde = !buscarTipo || tipoSelecionado === "Todos" || r.tipo === tipoSelecionado;
    return nomeCorresponde && tipoCorresponde;
  });
  const placeholderBusca = buscarNome && buscarTipo
    ? "Buscar por nome ou tipo"
    : buscarNome
      ? "Buscar por nome"
      : buscarTipo
        ? "Selecione um tipo"
        : "Busca desativada";
  const totalFiltrado = filtradas.reduce((soma, r) => soma + r.valor, 0);
  const pesquisaAtiva = (buscarNome && Boolean(busca.trim())) || (buscarTipo && tipoSelecionado !== "Todos");

  const itensLista: ItemListaReceita[] = [];
  const gruposAdicionados = new Set<number>();
  const receitasPorGrupo = new Map<number, Receita[]>();
  for (const receita of receitasDoMes) {
    if (!receita.grupo_parcelas_id) continue;
    const grupo = receitasPorGrupo.get(receita.grupo_parcelas_id) ?? [];
    grupo.push(receita);
    receitasPorGrupo.set(receita.grupo_parcelas_id, grupo);
  }
  for (const receita of filtradas) {
    if (receita.grupo_parcelas_id) {
      if (gruposAdicionados.has(receita.grupo_parcelas_id)) continue;
      gruposAdicionados.add(receita.grupo_parcelas_id);
      const integrantes = (receitasPorGrupo.get(receita.grupo_parcelas_id) ?? [])
        .sort((a, b) => a.numero_parcela - b.numero_parcela);
      itensLista.push({ chave: `g${receita.grupo_parcelas_id}`, natureza: "grupo", grupoId: receita.grupo_parcelas_id, receitas: integrantes });
    } else {
      itensLista.push({ chave: `r${receita.id}`, natureza: "receita", receita });
    }
  }

  const voltar = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/home/home");
    }
  };

  // Abre o cadastro vazio, para uma nova receita
  const adicionar = () => {
    router.push("/cadastros/cadReceita" as never);
  };

  const unificar = () => {
    router.push("/consultas/unificarReceitas" as never);
  };

  // Abre o cadastro em modo edição, com os dados da receita carregados
  const editar = (receita: Receita) => {
    router.push({
      pathname: "/cadastros/cadReceita",
      params: { id: String(receita.id) },
    } as never);
  };

  const alternarSelecao = (receita: Receita) => {
    setReceitasSelecionadas((selecionadas) => selecionadas.includes(receita.id)
      ? selecionadas.filter((id) => id !== receita.id)
      : [...selecionadas, receita.id]);
  };

  const carregar = useCallback(async () => {
    try {
      const [listaReceitas, listaBancos, listaTags] = await Promise.all([listarReceitas(), listarBancos(), listarTags()]);
      setReceitas(listaReceitas);
      setBancos(listaBancos);
      setTags(listaTags);
    } catch (erro) {
      console.error(erro);
      Alert.alert("Erro", "Não foi possível carregar as receitas.");
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

  const confirmarExclusao = (receita: Receita) => {
    Alert.alert(
      "Excluir receita",
      `Deseja excluir "${receita.nome}" (${formatarReal(receita.valor)})?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await excluirReceita(receita.id);
              await carregar();
            } catch (erro) {
              console.error(erro);
              Alert.alert("Erro", "Não foi possível excluir a receita.");
            }
          },
        },
      ]
    );
  };

  const confirmarRecebimento = (receita: Receita) => {
    if (bancos.length === 0) {
      Alert.alert("Cadastre um banco", "Para registrar o recebimento, primeiro cadastre o banco onde o valor entrou.", [
        { text: "Cancelar", style: "cancel" },
        { text: "Cadastrar banco", onPress: () => router.push("/cadastros/cadBanco" as never) },
      ]);
      return;
    }
    setReceitaParaReceber(receita);
  };

  const selecionarBancoDoRecebimento = async (bancoId: number | null) => {
    if (bancoId === null || !receitaParaReceber) return;
    const receita = receitaParaReceber;
    setReceitaParaReceber(null);
    try {
      await receberReceita(receita.id, bancoId);
      await carregar();
    } catch (erro) {
      console.error(erro);
      Alert.alert("Erro", "Não foi possível registrar o recebimento.");
    }
  };

  const renderReceita = (item: Receita, compacta = false) => {
    const status = statusDe(item, hoje);

    return (
      <TouchableOpacity
        style={compacta ? styles.itemGrupo : styles.card}
        activeOpacity={0.8}
        onPress={() => modoSelecao ? alternarSelecao(item) : editar(item)}
        accessibilityRole="button"
        accessibilityState={modoSelecao ? { selected: receitasSelecionadas.includes(item.id) } : undefined}
      >
        <View style={styles.cardInfo}>
          <Text style={styles.nome}>{item.nome}</Text>
          <Text style={styles.detalhe}>{item.tipo}</Text>
          {lerTags(item.tags_ids).length > 0 && <Text style={styles.detalheTags}>{lerTags(item.tags_ids).map((id) => tags.find((tag) => tag.id === id)?.nome).filter(Boolean).join(" · ")}</Text>}
          <Text style={styles.detalhe}>
            Entrada: {dataISOparaBR(item.data)} · Venc.:{" "}
            {dataISOparaBR(item.vencimento)}
          </Text>
          {item.grupo_parcelas_id && <Text style={styles.detalheParcela}>Parcela {item.numero_parcela} de {item.parcelas}</Text>}
          {item.banco_nome && <View style={styles.rotuloBanco}>
            <View style={[styles.corBanco, { backgroundColor: item.banco_cor || "#1565C0" }]} />
            <Text style={styles.nomeBanco}>{item.banco_nome}</Text>
          </View>}
          {item.observacao ? (
            <Text style={styles.observacao}>{item.observacao}</Text>
          ) : null}
          <Text
            style={[
              styles.status,
              status === "recebida" && styles.statusRecebido,
              status === "areceber" && styles.statusPendente,
              status === "vencida" && styles.statusVencida,
            ]}
          >
            {TEXTO_STATUS[status]}
          </Text>
        </View>

        <View style={styles.cardDireita}>
          {modoSelecao && <View style={styles.seletorReceita}>
            <Ionicons name={receitasSelecionadas.includes(item.id) ? "checkbox" : "square-outline"} size={24} color="#00897B" />
          </View>}
          <Text style={styles.valor}>{formatarReal(item.valor)}</Text>
          {status !== "recebida" && (
            <TouchableOpacity
              style={styles.botaoReceber}
              onPress={() => confirmarRecebimento(item)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Marcar ${item.nome} como recebida`}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
              <Text style={styles.botaoReceberTexto}>Receber</Text>
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
  };

  const renderItem = ({ item }: { item: ItemListaReceita }) => {
    if (item.natureza === "receita") return renderReceita(item.receita);
    const primeira = item.receitas[0];
    const totalGrupo = item.receitas.reduce((soma, receita) => soma + receita.valor, 0);
    const recebidas = item.receitas.filter((receita) => receita.recebido === 1).length;
    return (
      <CardParcelamento
        nome={primeira?.nome ?? "Parcelamento"}
        tipo={primeira?.tipo ?? "Receita"}
        total={totalGrupo}
        quantidade={item.receitas.length}
        pagas={recebidas}
        natureza="receita"
        aberto={Boolean(gruposAbertos[item.grupoId])}
        onPress={() => setGruposAbertos((atual) => ({ ...atual, [item.grupoId]: !atual[item.grupoId] }))}
      >
        {item.receitas.map((receita) => <View key={receita.id}>{renderReceita(receita, true)}</View>)}
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
        <Text style={styles.titulo}>Receitas</Text>
        <InfoButton compacto titulo="Consulta de receitas" texto="Veja e gerencie as receitas cadastradas. O botão + cria uma receita; use a ação de recebimento para registrar quando o valor entrar. Em Unificar receitas a receber, escolha a receita que continuará e a que será somada. A operação fica em Históricos > Unificações." />
      </View>

      {/* Resumo mensal com navegação entre meses */}
      <CardResumoRetratil>
      <View style={styles.resumo}>
        <View style={styles.resumoTopo}>
          <Text style={styles.resumoLabel}>
            Receitas recebidas ({receitasDoMes.filter((r) => r.recebido === 1).length})
          </Text>
        </View>
        <NavegadorMes mes={mesSelecionado} onChange={setMesSelecionado} />
        <Text style={styles.resumoValor}>{formatarReal(totalRecebido)}</Text>
        <Text style={styles.resumoDetalhe}>Faltam receber: {formatarReal(totalAReceber)}</Text>
        <Text style={styles.resumoDetalhe}>Total de receitas no mês: {formatarReal(total)}</Text>
        <View style={styles.linhaAdicionar}>
          <TouchableOpacity onPress={adicionar} hitSlop={12} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Adicionar receita">
            <Ionicons name="add-circle-outline" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.botaoUnificar} onPress={unificar} activeOpacity={0.8}>
          <Ionicons name="git-compare-outline" size={18} color="#FFFFFF" />
          <Text style={styles.botaoUnificarTexto}>Unificar receitas a receber</Text>
        </TouchableOpacity>
      </View>
      </CardResumoRetratil>

      {/* Filtros: todas, recebidas, a receber e vencidas */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtrosScroll}
        contentContainerStyle={styles.filtros}
      >
        {FILTROS.map((f) => {
          const ativo = filtro === f.chave;

          return (
            <TouchableOpacity
              key={f.chave}
              style={[styles.filtro, ativo && styles.filtroAtivo]}
              onPress={() => setFiltro(f.chave)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.filtroTexto, ativo && styles.filtroTextoAtivo]}
              >
                {f.rotulo} ({contagem[f.chave]})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.linhaBusca}>
        <TextInput style={[styles.busca, !buscarNome && styles.buscaDesativada]} value={busca} onChangeText={setBusca} placeholder={placeholderBusca} editable={buscarNome} returnKeyType="search" accessibilityLabel={placeholderBusca} />
        {pesquisaAtiva && <View style={styles.somaBusca} accessibilityLabel={`Soma dos resultados: ${formatarReal(totalFiltrado)}`}><Text style={styles.somaBuscaLabel}>Soma</Text><Text style={styles.somaBuscaValor} numberOfLines={1} adjustsFontSizeToFit>{formatarReal(totalFiltrado)}</Text></View>}
      </View>
      <View style={styles.linhaSelecao}>
        <TouchableOpacity
          style={[styles.botaoSelecao, modoSelecao && styles.botaoSelecaoAtivo]}
          onPress={() => {
            setModoSelecao((ativo) => !ativo);
            setReceitasSelecionadas([]);
          }}
          accessibilityRole="button"
          accessibilityState={{ selected: modoSelecao }}
        >
          <Ionicons name={modoSelecao ? "close-circle-outline" : "checkbox-outline"} size={18} color={modoSelecao ? "#FFFFFF" : "#00796B"} />
          <Text style={[styles.botaoSelecaoTexto, modoSelecao && styles.botaoSelecaoTextoAtivo]}>{modoSelecao ? "Concluir seleção" : "Selecionar receitas"}</Text>
        </TouchableOpacity>
        {modoSelecao && <View style={styles.totalSelecionado} accessibilityLabel={`Total selecionado: ${formatarReal(totalSelecionado)}`}>
          <Text style={styles.totalSelecionadoLabel}>{receitasDoMes.filter((receita) => receitasSelecionadas.includes(receita.id)).length} selecionada(s)</Text>
          <Text style={styles.totalSelecionadoValor}>{formatarReal(totalSelecionado)}</Text>
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

      {/* Resultado do filtro (quantidade e soma) */}
      {filtro !== "todas" && (
        <Text style={styles.resultado}>
          {filtradas.length} {filtradas.length === 1 ? "receita" : "receitas"} ·{" "}
          {formatarReal(totalFiltrado)}
        </Text>
      )}

      <FlatList
        data={itensLista}
        keyExtractor={(item) => item.chave}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          carregando ? null : (
            <View style={styles.vazio}>
              <Ionicons name="cash-outline" size={48} color="#BBBBBB" />
              <Text style={styles.vazioTexto}>{busca.trim() || (buscarTipo && tipoSelecionado !== "Todos") ? "Nenhuma receita encontrada" : MENSAGEM_VAZIO[filtro]}</Text>
            </View>
          )
        }
      />
      <ModalSeletorBanco
        bancos={bancos}
        visivel={receitaParaReceber !== null}
        valor={null}
        onFechar={() => setReceitaParaReceber(null)}
        onSelecionar={selecionarBancoDoRecebimento}
      />
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
    backgroundColor: "#00897B",
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
  resumoLabel: { fontSize: 14, color: "#E0F2F1" },
  resumoValor: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 4,
  },
  resumoDetalhe: { fontSize: 13, color: "#E0F2F1", marginTop: 4 },
  linhaAdicionar: { alignItems: "flex-end", marginTop: 4 },
  botaoUnificar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#00796B", borderRadius: 10, paddingVertical: 11, marginTop: 14 },
  botaoUnificarTexto: { color: "#FFFFFF", fontSize: 14, fontWeight: "bold" },

  // Filtros
  filtrosScroll: { height: 52, flexGrow: 0, flexShrink: 0, marginBottom: 12 },
  filtros: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 2,
    paddingRight: 20,
  },
  filtro: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 14,
    minHeight: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  filtroAtivo: { backgroundColor: "#00897B", borderColor: "#00897B" },
  filtroTexto: {
    fontSize: 14,
    lineHeight: 20,
    includeFontPadding: false,
    textAlignVertical: "center",
    color: "#1A1A1A",
  },
  filtroTextoAtivo: { color: "#FFFFFF", fontWeight: "bold" },
  resultado: { fontSize: 13, color: "#666666", marginBottom: 10 },

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
  detalheTags: { fontSize: 12, color: "#00796B", marginTop: 4 },
  observacao: { fontSize: 12, color: "#999999", marginTop: 2 },
  status: { fontSize: 12, fontWeight: "bold", marginTop: 4 },
  statusRecebido: { color: "#2E7D32" },
  statusPendente: { color: "#F57C00" },
  statusVencida: { color: "#D32F2F" },
  cardDireita: { alignItems: "flex-end", gap: 10 },
  seletorReceita: { padding: 2 },
  itemGrupo: { paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E7E7E7", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  detalheParcela: { fontSize: 12, color: "#00897B", fontWeight: "600", marginTop: 3 },
  valor: { fontSize: 17, fontWeight: "bold", color: "#2E7D32" },
  rotuloBanco: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 6, marginTop: 6, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 16, backgroundColor: "#F1F3F5" },
  corBanco: { width: 10, height: 10, borderRadius: 5 },
  nomeBanco: { color: "#555555", fontSize: 12, fontWeight: "600" },
  botaoReceber: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#00897B",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  botaoReceberTexto: { color: "#FFFFFF", fontSize: 12, fontWeight: "bold" },

  // Lista vazia
  vazio: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  vazioTexto: { fontSize: 16, color: "#999999" },
});
