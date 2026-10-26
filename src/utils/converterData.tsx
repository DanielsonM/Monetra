// "25/10/2026" -> "2026-10-25" (retorna null se a data for inválida)
export function dataBRparaISO(texto: string): string | null {
  const m = texto.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;

  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const ano = Number(m[3]);

  const d = new Date(ano, mes - 1, dia);
  if (
    d.getFullYear() !== ano ||
    d.getMonth() !== mes - 1 ||
    d.getDate() !== dia
  ) {
    return null;
  }

  return `${m[3]}-${m[2]}-${m[1]}`;
}

// "2026-10-10" -> "2026-11-10"
// Se o dia não existir no mês seguinte, usa o último dia (31/01 -> 28/02)
export function somarUmMes(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);

  const ultimoDiaProximoMes = new Date(ano, mes + 1, 0).getDate();
  const novoDia = Math.min(dia, ultimoDiaProximoMes);

  const data = new Date(ano, mes, novoDia); // mês já é o seguinte (índice 0-based)

  const aaaa = data.getFullYear();
  const mm = String(data.getMonth() + 1).padStart(2, "0");
  const dd = String(data.getDate()).padStart(2, "0");
  return `${aaaa}-${mm}-${dd}`;
}

// "2026-10-25" -> "25/10/2026"
export function dataISOparaBR(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}