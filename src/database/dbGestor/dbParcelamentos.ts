export type ModoValorParcelas = "total" | "parcela";

export function distribuirValoresParcelas(
  valorInformado: number,
  quantidade: number,
  modo: ModoValorParcelas
) {
  const centavosInformados = Math.round(valorInformado * 100);
  if (modo === "parcela") {
    return Array.from({ length: quantidade }, () => centavosInformados / 100);
  }
  const base = Math.floor(centavosInformados / quantidade);
  const sobra = centavosInformados - base * quantidade;
  return Array.from(
    { length: quantidade },
    (_, indice) => (base + (indice < sobra ? 1 : 0)) / 100
  );
}

export function dataDaParcela(dataISO: string, deslocamento: number) {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const primeiroDia = new Date(ano, mes - 1 + deslocamento, 1);
  const ultimoDia = new Date(
    primeiroDia.getFullYear(),
    primeiroDia.getMonth() + 1,
    0
  ).getDate();
  return `${primeiroDia.getFullYear()}-${String(primeiroDia.getMonth() + 1).padStart(2, "0")}-${String(Math.min(dia, ultimoDia)).padStart(2, "0")}`;
}
