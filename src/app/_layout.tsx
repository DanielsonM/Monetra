import { Stack, usePathname } from "expo-router";
import { useEffect } from "react";

export default function RootLayout() {
  const pathname = usePathname();

  // Diagnóstico: mostra no terminal cada tela que abre (pode apagar depois)
  useEffect(() => {
    console.log(">>> ROTA:", pathname);
  }, [pathname]);

  return <Stack screenOptions={{ headerShown: false }} />;
}