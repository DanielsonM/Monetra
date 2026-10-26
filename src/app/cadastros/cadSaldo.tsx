import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { inserirSaldo } from "../../database/dbGestor/dbSaldos";

// Edite as opções do combobox aqui
const TIPOS = ["Salário", "Renda extra", "Rendimentos", "Outros"];

// Máscara de moeda: os dígitos entram pela direita (centavos automáticos).
// Ex.: "475000" -> "4.750,00". Limite de 12 dígitos (até 9.999.999.999,99).
const formatarValor = (texto: string) => {
  const digitos = texto.replace(/\D/g, "").slice(0, 12);
  if (!digitos) return "";
  return (Number(digitos) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Converte "4.750,00" para o número 4750
const valorParaNumero = (texto: string) =>
  Number(texto.replace(/\./g, "").replace(",", ".")) || 0;

export default function CadSaldo() {
  const router = useRouter();
  const campoTipoRef = useRef<View>(null);

  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState("");

  const [tipoAberto, setTipoAberto] = useState(false);
  const [posTipo, setPosTipo] = useState({ top: 0, left: 0, width: 0 });

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

  const aoMudarValor = (texto: string) => {
    setValor(formatarValor(texto));
  };

  const salvar = async () => {
    const valorNumero = valorParaNumero(valor);

    if (valorNumero <= 0 || !tipo) {
      Alert.alert("Atenção", "Informe um valor maior que zero e o tipo.");
      return;
    }

    try {
      const id = await inserirSaldo({ valor: valorNumero, tipo });
      console.log("SALDO GRAVADO, ID:", id, "VALOR:", valorNumero, "TIPO:", tipo);
      Alert.alert("Pronto", "Saldo cadastrado!");
      voltar();
    } catch (erro) {
      console.error(erro);
      Alert.alert("Erro", "Não foi possível salvar o saldo.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabeçalho com botão de voltar */}
      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={voltar} hitSlop={10} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={28} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Novo saldo</Text>
      </View>

      <Text style={styles.label}>Valor</Text>
      <View style={styles.campoValor}>
        <Text style={styles.prefixo}>R$</Text>
        <TextInput
          style={styles.inputValor}
          placeholder="0,00"
          placeholderTextColor="#999999"
          keyboardType="number-pad"
          value={valor}
          onChangeText={aoMudarValor}
        />
      </View>

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
            { top: posTipo.top, left: posTipo.left, width: posTipo.width },
          ]}
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

  // Campo de valor com prefixo R$
  campoValor: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  prefixo: { fontSize: 18, color: "#666666", marginRight: 8 },
  inputValor: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 18,
    color: "#1A1A1A",
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
