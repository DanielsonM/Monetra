import { Redirect } from "expo-router";

// Tela inicial do app: redireciona para a Home
export default function Index() {
  console.log(">>> INDEX EXECUTOU");
  return <Redirect href="/home/home" />;
}