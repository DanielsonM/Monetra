import { Poppins_700Bold, useFonts } from "@expo-google-fonts/poppins";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ConCard from "../../components/conCard";
import DespesasRecentes from "../../components/despesasRecentes";
import { totalDespesas } from "../../database/dbGestor/dbDespesas";
import { totalSaldoPorTipo } from "../../database/dbGestor/dbSaldos";
import { sincronizarNotificacoes } from "../../services/notificacoes";

// Ícone colorido com fundo suave (cor + "22" = fundo com transparência)
type IconeMenuProps = {
  nome: keyof typeof Ionicons.glyphMap;
  cor: string;
  pequeno?: boolean;
};

function IconeMenu({ nome, cor, pequeno }: IconeMenuProps) {
  return (
    <View
      style={[
        styles.iconeBox,
        pequeno && styles.iconeBoxPequeno,
        { backgroundColor: cor + "22" },
      ]}
    >
      <Ionicons name={nome} size={pequeno ? 16 : 20} color={cor} />
    </View>
  );
}

export default function Home() {
  // Fonte do título (Poppins Bold)
  const [fonteCarregada] = useFonts({ Poppins_700Bold });

  const [menuAberto, setMenuAberto] = useState(false);
  const [cadastroAberto, setCadastroAberto] = useState(false);
  const [consultaAberto, setConsultaAberto] = useState(false);

  // Valores financeiros
  const [salarioMensal, setSalarioMensal] = useState(0);
  const [despesasTotais, setDespesasTotais] = useState(0);

  // Atualiza salário e despesas sempre que a Home volta a ficar em foco
  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      // Reagenda os avisos de vencimento (só despesas não pagas)
      sincronizarNotificacoes();

      // Para testar as notificações, tire as barras da linha abaixo.
      // Em 5 segundos deve aparecer uma notificação. Depois comente de novo.
      // testarNotificacao();

      Promise.all([totalSaldoPorTipo("Salário"), totalDespesas()])
        .then(([salario, despesas]) => {
          if (ativo) {
            setSalarioMensal(salario);
            setDespesasTotais(despesas);
          }
        })
        .catch((erro) => console.error(erro));

      return () => {
        ativo = false;
      };
    }, [])
  );

  const navegarPara = (rota: string) => {
    setMenuAberto(false);
    setCadastroAberto(false);
    setConsultaAberto(false);
    router.push(rota as never);
  };

  // Formata valores para Real brasileiro
  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        {/* Título centralizado */}
        <Text style={[styles.titulo, fonteCarregada && styles.tituloFonte]}>
          Monetra
        </Text>

        {/* Botão de menu à esquerda */}
        <TouchableOpacity
          style={styles.botaoMenu}
          onPress={() => setMenuAberto(!menuAberto)}
          activeOpacity={0.7}
        >
          <Text style={styles.iconeMenu}>☰</Text>
        </TouchableOpacity>

        {/* Menu suspenso */}
        {menuAberto && (
          <>
            {/* Fundo clicável para fechar o menu */}
            <TouchableWithoutFeedback onPress={() => setMenuAberto(false)}>
              <View style={styles.fundoMenu} />
            </TouchableWithoutFeedback>

            {/* Opções do menu */}
            <View style={styles.menu}>
              {/* Cadastro com submenu */}
              <TouchableOpacity
                style={styles.menuBotao}
                onPress={() => setCadastroAberto(!cadastroAberto)}
              >
                <IconeMenu nome="add-circle-outline" cor="#2E7D32" />
                <Text style={styles.menuItem}>Cadastro</Text>
              </TouchableOpacity>

              {cadastroAberto && (
                <View style={styles.submenu}>
                  <TouchableOpacity
                    style={styles.submenuBotao}
                    onPress={() => navegarPara("/cadastros/cadSaldo")}
                  >
                    <IconeMenu nome="wallet-outline" cor="#00897B" pequeno />
                    <Text style={styles.submenuItem}>Saldo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.submenuBotao}
                    onPress={() => navegarPara("/cadastros/cadDespesas")}
                  >
                    <IconeMenu nome="receipt-outline" cor="#D32F2F" pequeno />
                    <Text style={styles.submenuItem}>Despesas</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Consulta com submenu */}
              <TouchableOpacity
                style={styles.menuBotao}
                onPress={() => setConsultaAberto(!consultaAberto)}
              >
                <IconeMenu nome="search-outline" cor="#1976D2" />
                <Text style={styles.menuItem}>Consulta</Text>
              </TouchableOpacity>

              {consultaAberto && (
                <View style={styles.submenu}>
                  <TouchableOpacity
                    style={styles.submenuBotao}
                    onPress={() => navegarPara("/consultas/conDespesa")}
                  >
                    <IconeMenu nome="receipt-outline" cor="#D32F2F" pequeno />
                    <Text style={styles.submenuItem}>Despesas</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={styles.menuBotao}
                onPress={() => navegarPara("/configuracoes")}
              >
                <IconeMenu nome="settings-outline" cor="#6A1B9A" />
                <Text style={styles.menuItem}>Configurações</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuBotao}
                onPress={() => navegarPara("/metas")}
              >
                <IconeMenu nome="flag-outline" cor="#F57C00" />
                <Text style={styles.menuItem}>Metas</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Conteúdo rolável (para caber as despesas recentes) */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.conteudo}
      >
        {/* Saldo disponível (lógica e cálculo dentro do ConCard) */}
        <ConCard />

        {/* Salário mensal */}
        <View style={styles.cardInfo}>
          <Text style={styles.label}>Meu dinheiro</Text>

          <Text style={styles.infoValor}>{formatarMoeda(salarioMensal)}</Text>
        </View>

        {/* Despesas totais */}
        <View style={styles.cardInfo}>
          <Text style={styles.label}>Despesas totais</Text>

          <Text style={styles.infoValor}>{formatarMoeda(despesasTotais)}</Text>
        </View>

        {/* Últimas despesas cadastradas */}
        <DespesasRecentes />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    padding: 20,
  },

  // Espaço no fim da rolagem
  conteudo: {
    paddingBottom: 30,
  },

  // Cabeçalho
  header: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 30,
    position: "relative",
    zIndex: 10,
    elevation: 10,
  },

  // Título centralizado
  titulo: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#10B981",
    letterSpacing: -0.5,
    textAlign: "center",
  },

  // Aplicado quando a fonte Poppins termina de carregar
  tituloFonte: {
    fontFamily: "Poppins_700Bold",
    fontWeight: "normal",
  },

  // Botão de menu à esquerda
  botaoMenu: {
    position: "absolute",
    left: 0,
    top: 0,
    height: 45,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
    zIndex: 12,
    elevation: 12,
  },

  iconeMenu: {
    fontSize: 30,
    color: "#1A1A1A",
  },

  // Fundo para fechar o menu ao tocar fora
  fundoMenu: {
    position: "absolute",
    top: -100,
    bottom: -1000,
    left: -20,
    right: -20,
    zIndex: 1,
  },

  // Menu suspenso alinhado à esquerda
  menu: {
    position: "absolute",
    top: 45,
    left: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 8,
    width: 230,
    zIndex: 11,
    elevation: 13,

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },

  // Quadradinho colorido atrás do ícone
  iconeBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  iconeBoxPequeno: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },

  menuBotao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },

  menuItem: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A1A",
  },

  // Submenu (Cadastro e Consulta)
  submenu: {
    paddingLeft: 15,
  },

  submenuBotao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
    paddingLeft: 15,
  },

  submenuItem: {
    fontSize: 15,
    color: "#555555",
  },

  // Cards de informações
  cardInfo: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  label: {
    fontSize: 16,
    color: "#666666",
  },

  infoValor: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 8,
    color: "#1A1A1A",
  },
});
