import "server-only";

/*
 * The dollar in reais, to price a sale in BRL for buyers with Brazilian cards
 * (Stripe only charges those in reais when the artist is in Brazil). Banco
 * Central do Brasil's PTAX selling rate: official, free, published every
 * business day. Kept for an hour per server instance.
 */

let cached: { rate: number; day: string; at: number } | undefined;
const HOUR = 3_600_000;

const ptaxDay = (date: Date) =>
  `${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}-${date.getUTCFullYear()}`;

/** The latest PTAX rate (R$ per US$), or null when the Banco Central can't be reached. */
export async function usdToBrl(): Promise<{ rate: number; day: string } | null> {
  if (cached && Date.now() - cached.at < HOUR) return cached;
  const today = new Date();
  const from = new Date(today.getTime() - 10 * 24 * HOUR);
  const url =
    "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)" +
    `?@dataInicial='${ptaxDay(from)}'&@dataFinalCotacao='${ptaxDay(today)}'&$format=json&$select=cotacaoVenda,dataHoraCotacao`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000), cache: "no-store" });
    if (!res.ok) return cached ?? null;
    const json = (await res.json()) as { value?: { cotacaoVenda: number; dataHoraCotacao: string }[] };
    const last = json.value?.at(-1);
    if (!last || !(last.cotacaoVenda > 0)) return cached ?? null;
    cached = { rate: last.cotacaoVenda, day: last.dataHoraCotacao.slice(0, 10), at: Date.now() };
    return cached;
  } catch {
    return cached ?? null;
  }
}
