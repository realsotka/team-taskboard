// Клієнт для бекенда на Google Apps Script (Google Таблиці як база даних).
// URL веб-додатка Apps Script (Deploy → Web app, доступ: Anyone).
// PIN не зберігається тут — він вводиться на екрані входу і перевіряється сервером.
const GS_API_URL: string = import.meta.env.VITE_GS_API_URL ?? "";

let boardPin = "";
export function setBoardPin(pin: string) {
  boardPin = pin;
}

type GsResponse<T> = { data?: T; error?: string };

export async function gs<T = unknown>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch(GS_API_URL, {
    method: "POST",
    // text/plain = "simple request" без CORS preflight — обов'язково для Apps Script
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, pin: boardPin, ...payload }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
  const json: GsResponse<T> = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data as T;
}
