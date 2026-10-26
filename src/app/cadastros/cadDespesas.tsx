import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { inserirDespesa } from "../../database/dbGestor/dbDespesas";
import { sincronizarNotificacoes } from "../../services/notificacoes";
import { dataBRparaISO } from "../../utils/converterData";

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

export default function CadDespesas() {
  const router = useRouter();
  const { height: alturaTela } = useWindowDimensions();
  const campoTipoRef = useRef<View>(null);

  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [observacao, setObservacao] = useState("");

  const [tipoAberto, setTipoAberto] = useState(false);
  const [posTipo, setPosTipo] = useState({ top: 0, left: 0, width: 0 });

  // Altura máxima da lista: o que sobra da tela, limitado a 320
  const alturaMaxLista = Math.min(320, alturaTela - posTipo.top - 24);

  const voltar = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/home/home");
    }
  };

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

  const salvar = async () => {
    const valorNumero = parseFloat(valor.replace(",", "."));

    if (!nome.trim() || isNaN(valorNumero) || !tipo || !vencimento.trim()) {
      Alert.alert("Atenção", "Preencha nome, valor, tipo e vencimento.");
      return;
    }

    const vencimentoISO = dataBRparaISO(vencimento);
    if (!vencimentoISO) {
      Alert.alert("Atenção", "Data inválida. Use o formato DD/MM/AAAA.");
      return;
    }

    try {
      await inserirDespesa({
        nome: nome.trim(),
        valor: valorNumero,
        tipo,
        vencimento: vencimentoISO,
        observacao,
      });

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
        <Text style={styles.titulo}>Nova despesa</Text>
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
        keyboardType="decimal-pad"
        value={valor}
        onChangeText={setValor}
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
      <TextInput
        style={styles.input}
        placeholder="DD/MM/AAAA"
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        value={vencimento}
        onChangeText={setVencimento}
      />

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
        <Text style={styles.botaoTexto}>Salvar</Text>
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

  // Contador de caracteres da observação
  contador: {
    fontSize: 12,
    color: "#999999",
    textAlign: "right",
    marginTop: 4,
  },

  // Combobox
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