import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
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
  const [menuAberto, setMenuAberto] = useState(false);
  const [cadastroAberto, setCadastroAberto] = useState(false);
  const [consultaAberto, setConsultaAberto] = useState(false);

  const navegarPara = (rota: string) => {
    setMenuAberto(false);
    setCadastroAberto(false);
    setConsultaAberto(false);
    router.push(rota as never);
  };

  return (
    <>
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
              onPress={() => navegarPara("/historico/historico")}
            >
              <IconeMenu nome="stats-chart-outline" cor="#F57C00" />
              <Text style={styles.menuItem}>Histórico</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
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
});