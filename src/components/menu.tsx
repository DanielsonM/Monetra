import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

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

// Botão ☰ + menu suspenso.
// Deve ser colocado dentro de um container com position: "relative"
// (o header da tela), pois o botão e o menu são posicionados de forma absoluta.
export default function Menu() {
  const insets = useSafeAreaInsets();
  const [menuAberto, setMenuAberto] = useState(false);
  const [cadastroAberto, setCadastroAberto] = useState(false);
  const [consultaAberto, setConsultaAberto] = useState(false);
  const [recursosAberto, setRecursosAberto] = useState(false);
  const [historicosAberto, setHistoricosAberto] = useState(false);

  const fecharMenu = () => {
    setMenuAberto(false);
    setCadastroAberto(false);
    setConsultaAberto(false);
    setRecursosAberto(false);
    setHistoricosAberto(false);
  };

  const navegarPara = (rota: string) => {
    fecharMenu();
    router.push(rota as never);
  };

  return (
    <>
      {/* Botão de menu à esquerda */}
      <TouchableOpacity
        style={styles.botaoMenu}
        onPress={() => menuAberto ? fecharMenu() : setMenuAberto(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.iconeMenu}>☰</Text>
      </TouchableOpacity>

      <Modal visible={menuAberto} transparent animationType="fade" statusBarTranslucent onRequestClose={fecharMenu}>
        <View style={styles.modalContainer}>
          {/* Fundo clicável para fechar o menu */}
          <TouchableWithoutFeedback onPress={fecharMenu}>
            <View style={styles.fundoMenu} />
          </TouchableWithoutFeedback>

          <View style={[styles.menu, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 8 }]}>
            <View style={styles.cabecalhoMenu}>
              <Text style={styles.tituloMenu}>Mondi</Text>
              <TouchableOpacity onPress={fecharMenu} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fechar menu">
                <Ionicons name="close" size={26} color="#555555" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.opcoesMenu}
              contentContainerStyle={styles.menuConteudo}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
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
                  onPress={() => navegarPara("/cadastros/cadReceita")}
                >
                  <IconeMenu nome="cash-outline" cor="#2E7D32" pequeno />
                  <Text style={styles.submenuItem}>Receitas</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submenuBotao}
                  onPress={() => navegarPara("/cadastros/cadDespesas")}
                >
                  <IconeMenu nome="receipt-outline" cor="#D32F2F" pequeno />
                  <Text style={styles.submenuItem}>Despesas</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.submenuBotao} onPress={() => navegarPara("/cadastros/tags")}>
                  <IconeMenu nome="pricetag-outline" cor="#00897B" pequeno />
                  <Text style={styles.submenuItem}>Tags</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.submenuBotao} onPress={() => navegarPara("/cadastros/gastoRapido")}>
                  <IconeMenu nome="flash-outline" cor="#F57C00" pequeno />
                  <Text style={styles.submenuItem}>Gasto rápido</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.submenuBotao} onPress={() => navegarPara("/cadastros/cadAplicacao")}>
                  <IconeMenu nome="trending-up-outline" cor="#1565C0" pequeno />
                  <Text style={styles.submenuItem}>Aplicações</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submenuBotao} onPress={() => navegarPara("/cadastros/cadBanco")}>
                  <IconeMenu nome="business-outline" cor="#00897B" pequeno />
                  <Text style={styles.submenuItem}>Bancos</Text>
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
                  onPress={() => navegarPara("/consultas/conReceitas")}
                >
                  <IconeMenu nome="cash-outline" cor="#2E7D32" pequeno />
                  <Text style={styles.submenuItem}>Receitas</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submenuBotao}
                  onPress={() => navegarPara("/consultas/conDespesa")}
                >
                  <IconeMenu nome="receipt-outline" cor="#D32F2F" pequeno />
                  <Text style={styles.submenuItem}>Despesas</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.submenuBotao} onPress={() => navegarPara("/consultas/aplicacoes")}>
                  <IconeMenu nome="trending-up-outline" cor="#1565C0" pequeno />
                  <Text style={styles.submenuItem}>Aplicações</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submenuBotao} onPress={() => navegarPara("/consultas/bancos")}>
                  <IconeMenu nome="business-outline" cor="#00897B" pequeno />
                  <Text style={styles.submenuItem}>Bancos</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.menuBotao}
              onPress={() => navegarPara("/planejamento/planejamento")}
            >
              <IconeMenu nome="pie-chart-outline" cor="#00897B" />
              <Text style={styles.menuItem}>Planejamento</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuBotao} onPress={() => setRecursosAberto(!recursosAberto)}>
              <IconeMenu nome="apps-outline" cor="#00897B" />
              <Text style={styles.menuItem}>Mais recursos</Text>
            </TouchableOpacity>

            {recursosAberto && (
              <View style={styles.submenu}>
                <TouchableOpacity style={styles.submenuBotao} onPress={() => navegarPara("/consultas/buscarLancamentos")}>
                  <IconeMenu nome="search-outline" cor="#1976D2" pequeno />
                  <Text style={styles.submenuItem}>Buscar lançamentos</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submenuBotao} onPress={() => navegarPara("/metas/metas")}>
                  <IconeMenu nome="flag-outline" cor="#6A1B9A" pequeno />
                  <Text style={styles.submenuItem}>Metas de economia</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submenuBotao} onPress={() => navegarPara("/relatorios/relatorios")}>
                  <IconeMenu nome="document-text-outline" cor="#00897B" pequeno />
                  <Text style={styles.submenuItem}>Relatórios</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submenuBotao} onPress={() => navegarPara("/backup/backup")}>
                  <IconeMenu nome="shield-checkmark-outline" cor="#455A64" pequeno />
                  <Text style={styles.submenuItem}>Backup e restauração</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.menuBotao}
              onPress={() => navegarPara("/configuracao/configuracao")}
            >
              <IconeMenu nome="settings-outline" cor="#6A1B9A" />
              <Text style={styles.menuItem}>Configurações</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuBotao}
              onPress={() => setHistoricosAberto(!historicosAberto)}
            >
              <IconeMenu nome="stats-chart-outline" cor="#F57C00" />
              <Text style={styles.menuItem}>Históricos</Text>
            </TouchableOpacity>
            {historicosAberto && (
              <View style={styles.submenu}>
                <TouchableOpacity
                  style={styles.submenuBotao}
                  onPress={() => navegarPara("/historico/historico")}
                >
                  <IconeMenu nome="stats-chart-outline" cor="#F57C00" pequeno />
                  <Text style={styles.submenuItem}>Histórico financeiro</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submenuBotao}
                  onPress={() => navegarPara("/historico/unificacoes")}
                >
                  <IconeMenu nome="git-compare-outline" cor="#00897B" pequeno />
                  <Text style={styles.submenuItem}>Unificações</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
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

  // Fundo modal e gaveta lateral fixa
  modalContainer: { flex: 1 },
  fundoMenu: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  // Menu lateral com cabeçalho fixo e conteúdo rolável
  menu: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    width: Math.min(300, Dimensions.get("window").width * 0.8),
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "#D8D8D8",
    zIndex: 2,
    elevation: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 3, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
  },
  cabecalhoMenu: { height: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 6, marginBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E5E5E5" },
  tituloMenu: { color: "#10B981", fontSize: 22, fontWeight: "bold" },
  opcoesMenu: { flex: 1 },
  menuConteudo: {
    paddingTop: 8,
    paddingBottom: 18,
    backgroundColor: "#FFFFFF",
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

  // Submenus de Cadastro, Consulta e Históricos
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
});
