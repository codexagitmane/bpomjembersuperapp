import { createApiClient } from "@bpom/shared";

const TOKEN_KEY = "bpom_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export const api = createApiClient({
  baseURL: apiBaseUrl,
  getToken: () => getStoredToken(),
  onUnauthorized: () => {
    setStoredToken(null);
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  },
});

/**
 * Mengunduh file (Excel/PDF) dari endpoint API yang mengembalikan blob,
 * dengan menyertakan token auth. Memicu dialog "Save As" di browser.
 */
export async function downloadFile(path: string, filename: string, params?: Record<string, string | number>) {
  const res = await api.get(path, { params, responseType: "blob" });
  const url = window.URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
