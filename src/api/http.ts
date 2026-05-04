import axios, { type AxiosError, type AxiosInstance } from "axios";

export interface ConnectionSettings {
  mode: "mock" | "real";
  baseUrl: string;
  apiKey: string;
}

export function createHeadscaleHttp(settings: ConnectionSettings): AxiosInstance {
  const client = axios.create({
    baseURL: settings.baseUrl.replace(/\/$/, ""),
    timeout: 15_000,
  });

  client.interceptors.request.use((config) => {
    if (settings.apiKey) {
      config.headers.Authorization = `Bearer ${settings.apiKey}`;
    }

    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<{ message?: string }>) => {
      const message =
        error.response?.data?.message ??
        error.message ??
        "Headscale request failed. Check server URL and API key.";
      return Promise.reject(new Error(message));
    },
  );

  return client;
}
