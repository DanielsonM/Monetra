import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    CONFIG_PADRAO,
    type ConfigNotificacao,
    carregarConfigNotificacao,
    salvarConfigNotificacao,
} from "../../database/dbGestor/dbConfiguracoes";
import InfoButton from "../../components/infoButton";
import {
    horariosDoDia,
    sincronizarNotificacoes,
    testarNotificacao,
} from "../../services/notificacoes";

const OPCOES_DIAS = [0, 1, 2, 3, 5, 7, 10];
const OPCOES_INTERVALO = [1, 2, 3, 4, 6, 8, 12, 24];

const rotuloDias = (n: number) =>
  n === 0 ? "No dia" : n === 1 ? "1 dia" : `${n} dias`;

const formatarHora = (h: number) => `${String(h).padStart(2, "0")}:00`;

// Botãozinho de escolha (chip)
function Chip({
  texto,
  ativo,
  onPress,
}: {
  texto: string;
  ativo: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, ativo && styles.chipAtivo]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>
        {texto}
      </Text>
    </TouchableOpacity>
  );
}

// Controle − valor +
function Stepper({
  rotulo,
  valor,
  onMenos,
  onMais,
}: {
  rotulo: string;
  valor: string;
  onMenos: () => void;
  onMais: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperRotulo}>{rotulo}</Text>
      <View style={styles.stepperControle}>
        <TouchableOpacity
          style={styles.stepperBotao}
          onPress={onMenos}
          hitSlop={8}
        >
          <Ionicons name="remove" size={20} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.stepperValor}>{valor}</Text>
        <TouchableOpacity
          style={styles.stepperBotao}
          onPress={onMais}
          hitSlop={8}
        >
          <Ionicons name="add" size={20} color="#1A1A1A" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function Configuracao() {
  const router = useRouter();
  const [config, setConfig] = useState<ConfigNotificacao>(CONFIG_PADRAO);
  const [salvando, setSalvando] = useState(false);

  // Carrega as preferências salvas ao abrir a tela
  useEffect(() => {
    carregarConfigNotificacao()
      .then(setConfig)
      .catch((erro) => console.error(erro));
  }, []);

  const voltar = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/home/home");
    }
  };

  const mudar = (parcial: Partial<ConfigNotificacao>) =>
    setConfig((c) => ({ ...c, ...parcial }));

  // O início nunca passa do fim, e o fim nunca fica antes do início
  const mudarInicio = (delta: number) =>
    mudar({
      horaInicio: Math.min(
        Math.max(config.horaInicio + delta, 0),
        config.horaFim
      ),
    });

  const mudarFim = (delta: number) =>
    mudar({
      horaFim: Math.min(
        Math.max(config.horaFim + delta, config.horaInicio),
        23
      ),
    });

  const salvar = async () => {
    try {
      setSalvando(true);
      await salvarConfigNotificacao(config);
      await sincronizarNotificacoes();
      Alert.alert("Pronto", "Configurações salvas e avisos reagendados.");
    } catch (erro) {
      console.error(erro);
      Alert.alert("Erro", "Não foi possível salvar as configurações.");
    } finally {
      setSalvando(false);
    }
  };

  const horarios = horariosDoDia(config).map(formatarHora).join(", ");

  const resumo =
    `Você será avisado às ${horarios}` +
    (config.diasAntes === 0
      ? " no dia do vencimento"
      : `, começando ${rotuloDias(config.diasAntes)} antes do vencimento`) +
    (config.avisarAposVencer
      ? ", e continuará sendo avisado todo dia depois de vencida, até pagar."
      : ".");

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabeçalho com botão de voltar */}
      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={voltar} hitSlop={10} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={28} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Configurações</Text>
        <InfoButton compacto titulo="Configurações de avisos" texto="Defina com quantos dias de antecedência os avisos começam, a frequência das repetições e os horários das notificações. Os avisos continuam para despesas não pagas conforme as opções escolhidas." />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.conteudo}
      >
        <View style={styles.card}>
          <View style={styles.cardTitulo}>
            <Ionicons name="notifications-outline" size={22} color="#6A1B9A" />
            <Text style={styles.cardTituloTexto}>
              Notificações de vencimento
            </Text>
          </View>

          <Text style={styles.label}>Começar a avisar</Text>
          <View style={styles.chips}>
            {OPCOES_DIAS.map((n) => (
              <Chip
                key={n}
                texto={rotuloDias(n)}
                ativo={config.diasAntes === n}
                onPress={() => mudar({ diasAntes: n })}
              />
            ))}
          </View>
          <Text style={styles.dica}>antes do vencimento</Text>

          <Text style={styles.label}>Repetir a cada</Text>
          <View style={styles.chips}>
            {OPCOES_INTERVALO.map((n) => (
              <Chip
                key={n}
                texto={`${n}h`}
                ativo={config.intervaloHoras === n}
                onPress={() => mudar({ intervaloHoras: n })}
              />
            ))}
          </View>
          <Text style={styles.dica}>
            Com 24h, o aviso toca uma vez por dia, no primeiro horário.
          </Text>

          <Text style={styles.label}>Horário dos avisos</Text>
          <Stepper
            rotulo="Primeiro aviso às"
            valor={formatarHora(config.horaInicio)}
            onMenos={() => mudarInicio(-1)}
            onMais={() => mudarInicio(1)}
          />
          <Stepper
            rotulo="Último aviso às"
            valor={formatarHora(config.horaFim)}
            onMenos={() => mudarFim(-1)}
            onMais={() => mudarFim(1)}
          />
          <Text style={styles.dica}>
            Fora desse intervalo o celular não toca (evita avisos de madrugada).
          </Text>

          <View style={styles.linhaSwitch}>
            <View style={styles.switchTextos}>
              <Text style={styles.switchTitulo}>Continuar após vencer</Text>
              <Text style={styles.dica}>
                Avisa todo dia enquanto a despesa não for paga
              </Text>
            </View>
            <Switch
              value={config.avisarAposVencer}
              onValueChange={(v) => mudar({ avisarAposVencer: v })}
              trackColor={{ true: "#A5D6A7", false: "#CCCCCC" }}
              thumbColor={config.avisarAposVencer ? "#2E7D32" : "#F4F4F4"}
            />
          </View>
        </View>

        {/* Resumo do que vai acontecer com as configurações atuais */}
        <View style={styles.resumo}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color="#1976D2"
          />
          <Text style={styles.resumoTexto}>{resumo}</Text>
        </View>

        <TouchableOpacity
          style={[styles.botao, salvando && styles.botaoDesabilitado]}
          onPress={salvar}
          disabled={salvando}
        >
          <Text style={styles.botaoTexto}>
            {salvando ? "Salvando..." : "Salvar"}
          </Text>
        </TouchableOpacity>

        {/* Só aparece em modo de desenvolvimento (debug) */}
        {__DEV__ && (
          <TouchableOpacity
            style={styles.botaoSecundario}
            onPress={testarNotificacao}
          >
            <Ionicons name="paper-plane-outline" size={18} color="#2E7D32" />
            <Text style={styles.botaoSecundarioTexto}>
              Testar notificação (5 segundos)
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 20 },

  // Espaço no fim da rolagem
  conteudo: { paddingBottom: 20 },

  // Cabeçalho com seta de voltar
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  titulo: { fontSize: 28, fontWeight: "bold", color: "#1A1A1A" },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,

    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitulo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  cardTituloTexto: { fontSize: 18, fontWeight: "bold", color: "#1A1A1A" },

  label: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginTop: 18,
    marginBottom: 10,
  },
  dica: { fontSize: 12, color: "#888888", marginTop: 8 },

  // Chips de escolha
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
  },
  chipAtivo: { backgroundColor: "#2E7D32" },
  chipTexto: { fontSize: 14, color: "#444444" },
  chipTextoAtivo: { color: "#FFFFFF", fontWeight: "bold" },

  // Controle − valor +
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  stepperRotulo: { fontSize: 15, color: "#444444" },
  stepperControle: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepperBotao: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  stepperValor: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#1A1A1A",
    minWidth: 58,
    textAlign: "center",
  },

  // Chave "continuar após vencer"
  linhaSwitch: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 12,
  },
  switchTextos: { flex: 1 },
  switchTitulo: { fontSize: 15, fontWeight: "bold", color: "#1A1A1A" },

  // Resumo
  resumo: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#E3F2FD",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  resumoTexto: { flex: 1, fontSize: 14, color: "#0D47A1" },

  // Botões
  botao: {
    backgroundColor: "#2E7D32",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  botaoDesabilitado: { opacity: 0.6 },
  botaoTexto: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },

  botaoSecundario: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginTop: 8,
  },
  botaoSecundarioTexto: { color: "#2E7D32", fontSize: 15, fontWeight: "bold" },
});
