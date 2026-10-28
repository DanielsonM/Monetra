import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Platform,
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
  buscarReceita,
  inserirReceita,
  TIPO_SALARIO,
} from "../../database/dbGestor/dbReceitas";

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

// Qual campo de data está sendo escolhido no seletor
type CampoData = "entrada" | "vencimento";

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

export default function CadReceita() {
  const router = useRouter();

  // Se vier um "id" na rota, a tela abre em modo edição
  const { id } = useLocalSearchParams<{ id?: string }>();
  const idEdicao = id ? Number(id) : null;
  const editando = idEdicao !== null;

  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState("");
  const [dataEntrada, setDataEntrada] = useState<Date | null>(
    editando ? null : new Date()
  );
  const [vencimento, setVencimento] = useState<Date | null>(
    editando ? null : new Date()
  );
  const [recebido, setRecebido] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [campoData, setCampoData] = useState<CampoData | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Salário é dinheiro garantido: sempre conta como recebido
  const ehSalario = tipo === TIPO_SALARIO;

  const voltar = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/home/home");
    }
  };

  // Modo edição: carrega a receita e preenche os campos
  useEffect(() => {
    if (idEdicao === null) return;

    let ativo = true;

    buscarReceita(idEdicao)
      .then((r) => {
        if (!ativo) return;

        if (!r) {
          Alert.alert("Erro", "Receita não encontrada.");
          voltar();
          return;
        }

        setNome(r.nome);
        setValor(mascaraMoeda(String(Math.round(r.valor * 100))));
        setTipo(r.tipo);
        setDataEntrada(isoParaDate(r.data));
        setVencimento(isoParaDate(r.vencimento));
        setRecebido(r.recebido === 1);
        setObservacao(r.observacao ?? "");
      })
      .catch((erro) => {
        console.error(erro);
        Alert.alert("Erro", "Não foi possível carregar a receita.");
      });

    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idEdicao]);

  // Chamado quando o usuário escolhe (ou cancela) no seletor de data
  const aoMudarData = (evento: DateTimePickerEvent, dataEscolhida?: Date) => {
    const campo = campoData;
    setCampoData(null);

    if (evento.type !== "set" || !dataEscolhida) return;

    if (campo === "entrada") setDataEntrada(dataEscolhida);
    if (campo === "vencimento") setVencimento(dataEscolhida);
  };

  // Seletor de data exibido logo abaixo do campo que está sendo editado
  const seletorData = (campo: CampoData) => {
    if (campoData !== campo) return null;

    const atual = campo === "entrada" ? dataEntrada : vencimento;

    return (
      <DateTimePicker
        value={atual ?? new Date()}
        mode="date"
        display={Platform.OS === "ios" ? "inline" : "default"}
        locale="pt-BR"
        onChange={aoMudarData}
      />
    );
  };

  const salvar = async () => {
    const valorNumero = moedaParaNumero(valor);

    if (
      !nome.trim() ||
      isNaN(valorNumero) ||
      !tipo ||
      !dataEntrada ||
      !vencimento
    ) {
      Alert.alert(
        "Atenção",
        "Preencha nome, valor, tipo, data de entrada e vencimento."
      );
      return;
    }

    const dados = {
      nome: nome.trim(),
      valor: valorNumero,
      tipo,
      data: paraISO(dataEntrada),
      vencimento: paraISO(vencimento),
      observacao,
      recebido: ehSalario || recebido,
    };

    try {
      setSalvando(true);

      if (idEdicao !== null) {
        await atualizarReceita(idEdicao, dados);
        Alert.alert("Pronto", "Receita atualizada!");
      } else {
        await inserirReceita(dados);
        Alert.alert("Pronto", "Receita cadastrada!");
      }

      voltar();
    } catch (erro) {
      console.error(erro);
      Alert.alert("Erro", "Não foi possível salvar a receita.");
    } finally {
      setSalvando(false);
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
          {editando ? "Editar receita" : "Nova receita"}
        </Text>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.conteudo}
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
                style={[styles.chipTexto, tipo === t && styles.chipTextoAtivo]}
              >
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Data de entrada</Text>
        <TouchableOpacity
          style={styles.combo}
          onPress={() => setCampoData("entrada")}
          activeOpacity={0.7}
        >
          <Text
            style={dataEntrada ? styles.comboTexto : styles.comboPlaceholder}
          >
            {dataEntrada ? paraBR(dataEntrada) : "Selecione a data"}
          </Text>
          <Ionicons name="calendar-outline" size={20} color="#666666" />
        </TouchableOpacity>
        {seletorData("entrada")}

        <Text style={styles.label}>Vencimento</Text>
        <TouchableOpacity
          style={styles.combo}
          onPress={() => setCampoData("vencimento")}
          activeOpacity={0.7}
        >
          <Text style={vencimento ? styles.comboTexto : styles.comboPlaceholder}>
            {vencimento ? paraBR(vencimento) : "Selecione o vencimento"}
          </Text>
          <Ionicons name="calendar-outline" size={20} color="#666666" />
        </TouchableOpacity>
        {seletorData("vencimento")}

        {/* Recebida: se ligado, o valor entra no saldo disponível */}
        <View style={styles.linhaSwitch}>
          <View style={styles.textosSwitch}>
            <Text style={styles.switchTitulo}>Recebido</Text>
            <Text style={styles.switchSubtitulo}>
              {ehSalario
                ? "Salário entra automaticamente no saldo"
                : recebido
                  ? "Já recebida, soma no saldo disponível"
                  : "A receber, ainda não soma no saldo"}
            </Text>
          </View>
          <Switch
            value={ehSalario || recebido}
            onValueChange={setRecebido}
            disabled={ehSalario}
            trackColor={{ false: "#D0D0D0", true: "#80CBC4" }}
            thumbColor={ehSalario || recebido ? "#00897B" : "#F4F4F4"}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 20 },
  conteudo: { paddingBottom: 30 },

  // Cabeçalho com seta de voltar
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 6,
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

  // Campos de data
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
    marginTop: 30,
  },
  botaoDesabilitado: { opacity: 0.6 },
  botaoTexto: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
});