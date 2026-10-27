import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  atualizarReceita,
  excluirReceita,
  inserirReceita,
  listarReceitas,
  type Receita,
} from "../../database/dbGestor/dbReceitas";
import { dataISOparaBR } from "../../utils/converterData";

// Edite as opções de tipo de receita aqui
const TIPOS_RECEITA = [
  "Salário",
  "Freelance",
  "Vendas",
  "Investimentos",
  "Aluguel recebido",
  "Bonificação",
  "Reembolso",
  "Presente",
  "Outros",
];

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

// Formata valores para Real brasileiro (exibição)
const formatarReal = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Máscara de moeda: o usuário digita só números e o valor é montado
// da direita para a esquerda (5 → 0,05 | 700 → 7,00 | 123456 → 1.234,56)
const mascaraMoeda = (texto: string) => {
  const digitos = texto.replace(/\D/g, "").replace(/^0+/, "");
  if (!digitos) return "";
  const preenchido = digitos.padStart(3, "0");
  const inteiros = preenchido
    .slice(0, -2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${inteiros},${preenchido.slice(-2)}`;
};

// Converte "1.234,56" em 1234.56
const moedaParaNumero = (texto: string) =>
  parseFloat(texto.replace(/\./g, "").replace(",", "."));

// Formatadores locais (não usam toISOString, que converte para UTC
// e pode mudar o dia dependendo do horário)
const paraBR = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

const paraISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Converte "AAAA-MM-DD" em Date no horário local
const isoParaDate = (iso: string) => {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
};

// Define a situação da receita (datas em AAAA-MM-DD comparam bem como texto)
const statusDe = (r: Receita, hoje: string): StatusReceita => {
  if (r.recebido === 1) return "recebida";
  return r.vencimento < hoje ? "vencida" : "areceber";
};

export default function ConReceita() {
  const router = useRouter();

  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("todas");

  // Formulário (abre em modal dentro da própria tela)
  const [formAberto, setFormAberto] = useState(false);
  const [idEdicao, setIdEdicao] = useState<number | null>(null);
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState("");
  const [vencimento, setVencimento] = useState<Date | null>(null);
  const [recebido, setRecebido] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [mostrarData, setMostrarData] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const editando = idEdicao !== null;
  const hoje = paraISO(new Date());

  // Totais gerais (card de resumo)
  const total = receitas.reduce((soma, r) => soma + r.valor, 0);
  const totalRecebido = receitas.reduce(
    (soma, r) => (r.recebido === 1 ? soma + r.valor : soma),
    0
  );

  // Quantidade de receitas em cada filtro
  const contagem: Record<Filtro, number> = {
    todas: receitas.length,
    recebidas: 0,
    areceber: 0,
    vencidas: 0,
  };
  for (const r of receitas) {
    const status = statusDe(r, hoje);
    if (status === "recebida") contagem.recebidas++;
    else if (status === "vencida") contagem.vencidas++;
    else contagem.areceber++;
  }

  // Lista exibida de acordo com o filtro escolhido
  const filtradas =
    filtro === "todas"
      ? receitas
      : receitas.filter(
          (r) => statusDe(r, hoje) === STATUS_DO_FILTRO[filtro]
        );
  const totalFiltrado = filtradas.reduce((soma, r) => soma + r.valor, 0);

  const voltar = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/home/home");
    }
  };

  const carregar = useCallback(async () => {
    try {
      setReceitas(await listarReceitas());
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

  // Abre o formulário vazio (botão "+")
  const abrirNova = () => {
    setIdEdicao(null);
    setNome("");
    setValor("");
    setTipo("");
    setVencimento(new Date());
    setRecebido(false);
    setObservacao("");
    setFormAberto(true);
  };

  // Abre o formulário preenchido com a receita tocada
  const abrirEdicao = (r: Receita) => {
    setIdEdicao(r.id);
    setNome(r.nome);
    setValor(mascaraMoeda(String(Math.round(r.valor * 100))));
    setTipo(r.tipo);
    setVencimento(isoParaDate(r.vencimento));
    setRecebido(r.recebido === 1);
    setObservacao(r.observacao ?? "");
    setFormAberto(true);
  };

  const fecharForm = () => {
    setMostrarData(false);
    setFormAberto(false);
  };

  // Chamado quando o usuário escolhe (ou cancela) no seletor de data
  const aoMudarData = (evento: DateTimePickerEvent, dataEscolhida?: Date) => {
    setMostrarData(false);
    if (evento.type === "set" && dataEscolhida) setVencimento(dataEscolhida);
  };

  const salvar = async () => {
    const valorNumero = moedaParaNumero(valor);

    if (!nome.trim() || isNaN(valorNumero) || !tipo || !vencimento) {
      Alert.alert("Atenção", "Preencha nome, valor, tipo e vencimento.");
      return;
    }

    const dados = {
      nome: nome.trim(),
      valor: valorNumero,
      tipo,
      vencimento: paraISO(vencimento),
      observacao,
      recebido,
    };

    try {
      setSalvando(true);

      if (idEdicao !== null) {
        await atualizarReceita(idEdicao, dados);
      } else {
        await inserirReceita(dados);
      }

      fecharForm();
      await carregar();
    } catch (erro) {
      console.error(erro);
      Alert.alert("Erro", "Não foi possível salvar a receita.");
    } finally {
      setSalvando(false);
    }
  };

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

  const renderItem = ({ item }: { item: Receita }) => {
    const status = statusDe(item, hoje);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => abrirEdicao(item)}
      >
        <View style={styles.cardInfo}>
          <Text style={styles.nome}>{item.nome}</Text>
          <Text style={styles.detalhe}>
            {item.tipo} · Venc. {dataISOparaBR(item.vencimento)}
          </Text>
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
          <Text style={styles.valor}>{formatarReal(item.valor)}</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabeçalho com botão de voltar */}
      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={voltar} hitSlop={10} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={28} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Receitas</Text>
      </View>

      {/* Resumo com o botão "+" para adicionar receita */}
      <View style={styles.resumo}>
        <View style={styles.resumoTopo}>
          <Text style={styles.resumoLabel}>
            Total ({receitas.length}{" "}
            {receitas.length === 1 ? "receita" : "receitas"})
          </Text>

          <TouchableOpacity
            onPress={abrirNova}
            hitSlop={12}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.resumoValor}>{formatarReal(total)}</Text>
        <Text style={styles.resumoDetalhe}>
          Recebido: {formatarReal(totalRecebido)}
        </Text>
      </View>

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

      {/* Resultado do filtro (quantidade e soma) */}
      {filtro !== "todas" && (
        <Text style={styles.resultado}>
          {filtradas.length} {filtradas.length === 1 ? "receita" : "receitas"} ·{" "}
          {formatarReal(totalFiltrado)}
        </Text>
      )}

      <FlatList
        data={filtradas}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          carregando ? null : (
            <View style={styles.vazio}>
              <Ionicons name="cash-outline" size={48} color="#BBBBBB" />
              <Text style={styles.vazioTexto}>{MENSAGEM_VAZIO[filtro]}</Text>
            </View>
          )
        }
      />

      {/* Formulário de cadastro / edição */}
      <Modal
        transparent
        visible={formAberto}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={fecharForm}
      >
        <KeyboardAvoidingView
          style={styles.modalFundo}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Toque fora fecha o formulário */}
          <Pressable style={StyleSheet.absoluteFill} onPress={fecharForm} />

          <View style={styles.modalCard}>
            <View style={styles.modalCabecalho}>
              <Text style={styles.modalTitulo}>
                {editando ? "Editar receita" : "Nova receita"}
              </Text>
              <TouchableOpacity
                onPress={fecharForm}
                hitSlop={10}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={26} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.label}>Nome</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex.: Salário de outubro"
                value={nome}
                onChangeText={setNome}
              />

              <Text style={styles.label}>Valor</Text>
              <TextInput
                style={styles.input}
                placeholder="0,00"
                keyboardType="number-pad"
                value={valor}
                onChangeText={(texto) => setValor(mascaraMoeda(texto))}
              />

              <Text style={styles.label}>Tipo</Text>
              <View style={styles.chips}>
                {TIPOS_RECEITA.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.chip, tipo === t && styles.chipAtivo]}
                    onPress={() => setTipo(t)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipTexto,
                        tipo === t && styles.chipTextoAtivo,
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Vencimento</Text>
              <TouchableOpacity
                style={styles.combo}
                onPress={() => setMostrarData(true)}
                activeOpacity={0.7}
              >
                <Text
                  style={vencimento ? styles.comboTexto : styles.comboPlaceholder}
                >
                  {vencimento ? paraBR(vencimento) : "Selecione o vencimento"}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#666666" />
              </TouchableOpacity>

              {mostrarData && (
                <DateTimePicker
                  value={vencimento ?? new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  locale="pt-BR"
                  onChange={aoMudarData}
                />
              )}

              {/* Recebida: se ligado, o valor entra no saldo disponível */}
              <View style={styles.linhaSwitch}>
                <View style={styles.textosSwitch}>
                  <Text style={styles.switchTitulo}>Recebido</Text>
                  <Text style={styles.switchSubtitulo}>
                    {recebido
                      ? "Já recebida, soma no saldo disponível"
                      : "A receber, ainda não soma no saldo"}
                  </Text>
                </View>
                <Switch
                  value={recebido}
                  onValueChange={setRecebido}
                  trackColor={{ false: "#D0D0D0", true: "#80CBC4" }}
                  thumbColor={recebido ? "#00897B" : "#F4F4F4"}
                />
              </View>

              <Text style={styles.label}>Observação (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex.: pagamento extra"
                maxLength={30}
                value={observacao}
                onChangeText={setObservacao}
              />
              <Text style={styles.contador}>{observacao.length}/30</Text>

              <TouchableOpacity
                style={[styles.botao, salvando && styles.botaoDesabilitado]}
                onPress={salvar}
                disabled={salvando}
              >
                <Text style={styles.botaoTexto}>
                  {editando ? "Salvar alterações" : "Salvar"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
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

  // Filtros
  filtrosScroll: { flexGrow: 0, marginBottom: 12 },
  filtros: { flexDirection: "row", gap: 8, paddingRight: 20 },
  filtro: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  filtroAtivo: { backgroundColor: "#00897B", borderColor: "#00897B" },
  filtroTexto: { fontSize: 14, color: "#1A1A1A" },
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
  observacao: { fontSize: 12, color: "#999999", marginTop: 2 },
  status: { fontSize: 12, fontWeight: "bold", marginTop: 4 },
  statusRecebido: { color: "#2E7D32" },
  statusPendente: { color: "#F57C00" },
  statusVencida: { color: "#D32F2F" },
  cardDireita: { alignItems: "flex-end", gap: 10 },
  valor: { fontSize: 17, fontWeight: "bold", color: "#2E7D32" },

  // Lista vazia
  vazio: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  vazioTexto: { fontSize: 16, color: "#999999" },

  // Modal do formulário
  modalFundo: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  modalCard: {
    backgroundColor: "#F5F5F5",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: "90%",
  },
  modalCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  modalTitulo: { fontSize: 22, fontWeight: "bold", color: "#1A1A1A" },

  label: { fontSize: 14, color: "#666666", marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1A1A1A",
  },

  // Seleção do tipo (chips)
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  chipAtivo: { backgroundColor: "#E0F2F1", borderColor: "#00897B" },
  chipTexto: { fontSize: 14, color: "#1A1A1A" },
  chipTextoAtivo: { color: "#00695C", fontWeight: "bold" },

  // Campo de data
  combo: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  comboTexto: { fontSize: 16, color: "#1A1A1A" },
  comboPlaceholder: { fontSize: 16, color: "#999999" },

  // Switch "Recebido"
  linhaSwitch: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  textosSwitch: { flex: 1, paddingRight: 10 },
  switchTitulo: { fontSize: 16, color: "#1A1A1A" },
  switchSubtitulo: { fontSize: 12, color: "#999999", marginTop: 2 },

  // Contador de caracteres da observação
  contador: {
    fontSize: 12,
    color: "#999999",
    textAlign: "right",
    marginTop: 4,
  },

  botao: {
    backgroundColor: "#00897B",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  botaoDesabilitado: { opacity: 0.6 },
  botaoTexto: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
});