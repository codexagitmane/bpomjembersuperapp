import { createApiClient } from "@bpom/shared";
import { getStoredToken, setStoredToken } from "./storage";

// Untuk device fisik/emulator, ganti localhost dengan IP LAN mesin dev Anda,
// atau set EXPO_PUBLIC_API_URL di file .env sebelum menjalankan `expo start`.
export const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000/api";

export const api = createApiClient({
  baseURL: apiBaseUrl,
  getToken: () => getStoredToken(),
  onUnauthorized: () => {
    setStoredToken(null);
  },
});
