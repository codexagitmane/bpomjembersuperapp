import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "bpom_token";

// Cache in-memory supaya pemanggilan berulang (mis. tiap request API) tidak
// selalu menunggu I/O SecureStore yang async.
let cachedToken: string | null | undefined;

export async function getStoredToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  const value = await SecureStore.getItemAsync(TOKEN_KEY);
  cachedToken = value;
  return value;
}

export async function setStoredToken(token: string | null): Promise<void> {
  cachedToken = token;
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}
