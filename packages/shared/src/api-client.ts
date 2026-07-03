import axios, { AxiosError, AxiosInstance } from "axios";
import type { ApiErrorResponse } from "./types";

export interface CreateApiClientOptions {
  baseURL: string;
  getToken: () => Promise<string | null> | string | null;
  onUnauthorized?: () => void;
}

/**
 * Factory client HTTP dipakai bersama oleh web (Next.js) dan mobile (Expo).
 * Token disuntikkan lewat callback `getToken` supaya penyimpanan token bisa
 * berbeda per platform (httpOnly cookie / localStorage vs SecureStore).
 */
export function createApiClient(opts: CreateApiClientOptions): AxiosInstance {
  const client = axios.create({
    baseURL: opts.baseURL,
    timeout: 20000,
    headers: {
      Accept: "application/json",
    },
  });

  client.interceptors.request.use(async (config) => {
    const token = await opts.getToken();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (res) => res,
    (error: AxiosError<ApiErrorResponse>) => {
      if (error.response?.status === 401) {
        opts.onUnauthorized?.();
      }
      return Promise.reject(error);
    }
  );

  return client;
}

export function extractApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.message ?? "Terjadi kesalahan pada server.";
  }
  return "Terjadi kesalahan yang tidak diketahui.";
}
