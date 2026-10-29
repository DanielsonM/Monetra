import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  atualizarDespesa,
  buscarDespesa,
  inserirDespesa,
  pagarDespesa,
} from "../../database/dbGestor/dbDespesas";
import { sincronizarNotificacoes } from "../../services/notificacoes";
import InfoButton from "../../components/infoButton";

// Edite as opções do combobox aqui
const TIPOS = [
  "Aluguel",
  "Condomínio",
  "Água",
  "Energia",
  "Internet",
  "Telefone",
  "Empréstimo",
  "Financiamento",
  "Cartão de Crédito",
  "Seguro",
  "IPVA",
  "IPTU",
  "Combustível",
  "Transporte",
  "Supermercado",
  "Alimentação",
  "Farmácia",
  "Saúde",
  "Academia",
  "Educação",
  "Mensalidade Escolar",
  "Streaming",
  "Lazer",
  "Viagem",
  "Manutenção",
  "Investimento",
  "Impostos",
  "Salário Funcionário",
  "Outros",
];

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

// Máscara de moeda: o usuário digita só números e o valor é montado
// da direita para a esquerda (5 → 0,05 | 700 → 7,00 | 123456 → 1.234,56)
const formatarMoeda = (texto: string) => {
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

export default function CadDespesas() {
  const router = useRouter();
  const { height: alturaTela } = useWindowDimensions();
  const campoTipoRef = useRef<View>(null);

  // Se vier um "id" na rota, a tela abre em modo edição
  const { id } = useLocalSearchParams<{ id?: string }>();
  const idEdicao = id ? Number(id) : null;
  const editando = idEdicao !== null;

  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [parcelas, setParcelas] = useState("1");
  const [tipo, setTipo] = useState("");
  const [vencimento, setVencimento] = useState<Date | null>(null);
  const [observacao, setObservacao] = useState("");
  const [jaPaga, setJaPaga] = useState(false);
  const [fixa, setFixa] = useState(false);
  const [frequencia, setFrequencia] = useState<"semanal" | "mensal" | "anual">("mensal");

  const [tipoAberto, setTipoAberto] = useState(false);
  const [posTipo, setPosTipo] = useState({ top: 0, left: 0, width: 0 });
  const [mostrarData, setMostrarData] = useState(false);

  // Altura máxima da lista: o que sobra da tela, limitado a 320
  const alturaMaxLista = Math.min(320, alturaTela - posTipo.top - 24);

  const voltar = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/home/home");
    }
  };

  // Modo edição: carrega a despesa e preenche os campos
  useEffect(() => {
    if (idEdicao === null) return;

    let ativo = true;

    buscarDespesa(idEdicao)
      .then((d) => {
        if (!ativo) return;

        if (!d) {
          Alert.alert("Erro", "Despesa não encontrada.");
          voltar();
          return;
        }

        setNome(d.nome);
        setValor(formatarMoeda(String(Math.round(d.valor * 100))));
        setParcelas(String(d.parcelas ?? 1));
        setTipo(d.tipo);
        setVencimento(isoParaDate(d.vencimento));
        setObservacao(d.observacao ?? "");
        setFixa(d.fixa === 1);
        setFrequencia(d.frequencia ?? "mensal");
      })
      .catch((erro) => {
        console.error(erro);
        Alert.alert("Erro", "Não foi possível carregar a despesa.");
      });

    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idEdicao]);

  const abrirTipo = () => {
    campoTipoRef.current?.measureInWindow((x, y, w, h) => {
      setPosTipo({ top: y + h + 4, left: x, width: w });
      setTipoAberto(true);
    });
  };

  const escolherTipo = (t: string) => {
    setTipo(t);
    setTipoAberto(false);
  };

  // Chamado quando o usuário escolhe (ou cancela) no seletor de data
  const aoMudarData = (evento: DateTimePickerEvent, data?: Date) => {
    setMostrarData(false);
    if (evento.type === "set" && data) setVencimento(data);
  };

  const salvar = async () => {
    const valorNumero = moedaParaNumero(valor);
    const parcelasNumero = Number(parcelas);

    if (
      !nome.trim() ||
      isNaN(valorNumero) ||
      !tipo ||
      !vencimento ||
      !Number.isInteger(parcelasNumero) ||
      parcelasNumero < 1
    ) {
      Alert.alert("Atenção", "Preencha os campos e informe um número inteiro de parcelas maior que zero.");
      return;
    }

    const dados = {
      nome: nome.trim(),
      valor: valorNumero,
      tipo,
      vencimento: paraISO(vencimento),
      observacao,
      fixa,
      frequencia,
      parcelas: parcelasNumero,
    };

    try {
      // Modo edição: só atualiza os dados (o pagamento continua pelo botão "pagar")
      if (idEdicao !== null) {
        await atualizarDespesa(idEdicao, dados);
        await sincronizarNotificacoes();

        Alert.alert("Pronto", "Despesa atualizada!");
        voltar();
        return;
      }

      const novoId = await inserirDespesa(dados);

      // Se já está paga: usa o mesmo fluxo do botão "pagar"
      // (grava no histórico e marca como paga; se for fixa, leva o
      // vencimento para o mês seguinte)
      if (jaPaga) {
        await pagarDespesa(novoId);
      }

      // Agenda os avisos de vencimento da nova despesa
      await sincronizarNotificacoes();

      Alert.alert("Pronto", "Despesa cadastrada!");
      voltar();
    } catch (erro) {
      console.error(erro);
      Alert.alert("Erro", "Não foi possível salvar a despesa.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabeçalho com botão de voltar */}
      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={voltar} hitSlop={10} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={28} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.titulo}>
          {editando ? "Editar despesa" : "Nova despesa"}
        </Text>
        <InfoButton compacto titulo="Cadastro de despesa" texto="Informe nome, valor e vencimento. Marque como fixa se a despesa se repetir mensalmente. Se marcar como paga, o valor sai do saldo disponível e o pagamento fica no histórico." />
      </View>

      <Text style={styles.label}>Nome</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex.: Aluguel"
        value={nome}
        onChangeText={setNome}
      />

      <Text style={styles.label}>Valor</Text>
      <TextInput
        style={styles.input}
        placeholder="0,00"
        keyboardType="number-pad"
        value={valor}
        onChangeText={(texto) => setValor(formatarMoeda(texto))}
      />

      <Text style={styles.label}>Tipo</Text>
      <View ref={campoTipoRef} collapsable={false}>
        <TouchableOpacity
          style={styles.combo}
          onPress={abrirTipo}
          activeOpacity={0.7}
        >
          <Text style={tipo ? styles.comboTexto : styles.comboPlaceholder}>
            {tipo || "Selecione o tipo"}
          </Text>
          <Ionicons
            name={tipoAberto ? "chevron-up" : "chevron-down"}
            size={20}
            color="#666666"
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Vencimento</Text>
      <TouchableOpacity
        style={styles.combo}
        onPress={() => setMostrarData(true)}
        activeOpacity={0.7}
      >
        <Text style={vencimento ? styles.comboTexto : styles.comboPlaceholder}>
          {vencimento ? paraBR(vencimento) : "Selecione a data"}
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

      <Text style={styles.label}>Número de parcelas</Text>
      <TextInput
        style={styles.input}
        placeholder="1"
        keyboardType="number-pad"
        value={parcelas}
        onChangeText={(texto) => setParcelas(texto.replace(/\D/g, ""))}
      />

      {/* Despesa recorrente */}
      <View style={styles.linhaSwitch}>
        <View style={styles.textosSwitch}>
          <Text style={styles.switchTitulo}>Despesa fixa</Text>
          <Text style={styles.switchSubtitulo}>
            {fixa
              ? `Se repete ${frequencia === "semanal" ? "toda semana" : frequencia === "anual" ? "todo ano" : "todo mês"}`
              : "Despesa única, não se repete"}
          </Text>
        </View>
        <Switch
          value={fixa}
          onValueChange={setFixa}
          trackColor={{ false: "#D0D0D0", true: "#A5D6A7" }}
          thumbColor={fixa ? "#2E7D32" : "#F4F4F4"}
        />
      </View>

      {fixa && (
        <View style={styles.frequencias}>
          {(["semanal", "mensal", "anual"] as const).map((opcao) => (
            <TouchableOpacity key={opcao} onPress={() => setFrequencia(opcao)} style={[styles.frequencia, frequencia === opcao && styles.frequenciaAtiva]}>
              <Text style={[styles.frequenciaTexto, frequencia === opcao && styles.frequenciaTextoAtivo]}>{opcao.charAt(0).toUpperCase() + opcao.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Marca a despesa como paga já no cadastro (só em despesa nova) */}
      {!editando && (
        <View style={styles.linhaSwitch}>
          <View style={styles.textosSwitch}>
            <Text style={styles.switchTitulo}>Despesa paga</Text>
            {/*<Text style={styles.switchSubtitulo}>
              {jaPaga
                ? "Paga — próximo vencimento no mês seguinte"
                : "Pendente"}
            </Text>*/}
          </View>
          <Switch
            value={jaPaga}
            onValueChange={setJaPaga}
            trackColor={{ false: "#D0D0D0", true: "#A5D6A7" }}
            thumbColor={jaPaga ? "#2E7D32" : "#F4F4F4"}
          />
        </View>
      )}

      <Text style={styles.label}>Observação (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex.: parcela 3 de 12"
        maxLength={30}
        value={observacao}
        onChangeText={setObservacao}
      />
      <Text style={styles.contador}>{observacao.length}/30</Text>

      <TouchableOpacity style={styles.botao} onPress={salvar}>
        <Text style={styles.botaoTexto}>
          {editando ? "Salvar alterações" : "Salvar"}
        </Text>
      </TouchableOpacity>

      {/* Lista do combobox */}
      <Modal
        transparent
        visible={tipoAberto}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setTipoAberto(false)}
      >
        {/* Toque fora fecha a lista */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setTipoAberto(false)}
        />

        <View
          style={[
            styles.lista,
            {
              top: posTipo.top,
              left: posTipo.left,
              width: posTipo.width,
              maxHeight: alturaMaxLista,
            },
          ]}
        >
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
          >
            {TIPOS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.opcao, tipo === t && styles.opcaoAtiva]}
                onPress={() => escolherTipo(t)}
              >
                <Text style={styles.opcaoTexto}>{t}</Text>
                {tipo === t && (
                  <Ionicons name="checkmark" size={20} color="#2E7D32" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
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

  label: { fontSize: 14, color: "#666666", marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1A1A1A",
  },

  // Switches "Despesa fixa" e "Despesa paga"
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
  frequencias: { flexDirection: "row", gap: 8, marginTop: 8, marginLeft: 4 },
  frequencia: { borderRadius: 18, borderWidth: 1, borderColor: "#CCCCCC", paddingHorizontal: 12, paddingVertical: 7 },
  frequenciaAtiva: { backgroundColor: "#E0F2F1", borderColor: "#00897B" },
  frequenciaTexto: { color: "#666666", fontSize: 13 },
  frequenciaTextoAtivo: { color: "#00897B", fontWeight: "bold" },

  // Contador de caracteres da observação
  contador: {
    fontSize: 12,
    color: "#999999",
    textAlign: "right",
    marginTop: 4,
  },

  // Combobox (também usado no campo de data)
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

  lista: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  opcao: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  opcaoAtiva: { backgroundColor: "#E8F5E9" },
  opcaoTexto: { fontSize: 16, color: "#1A1A1A" },

  botao: {
    backgroundColor: "#2E7D32",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 30,
  },
  botaoTexto: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
});
