import axios, { AxiosInstance } from "axios";

const API_BASE_URL = "/api/proxy";

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// ─── Request interceptor to attach auth token ────────────────────────────────
import { useAuthStore } from "@/store/auth-store";

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const user = useAuthStore.getState().user;
    if (!user) {
      const guestToken = localStorage.getItem("guest_token");
      if (guestToken) {
        config.headers.Authorization = `Bearer ${guestToken}`;
      }
    }
  }
  return config;
});

// ─── Response interceptor for error handling ─────────────────────────────────

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect if the 401 is NOT from the login or register endpoints
    const isAuthRoute =
      error.config?.url?.includes("/auth/login") ||
      error.config?.url?.includes("/auth/register");

    const isUserNotFound =
      error.response?.status === 404 &&
      (error.response?.data?.message?.includes("User not found") ||
        error.response?.data?.message?.includes("Pengguna not found"));

    if ((error.response?.status === 401 || isUserNotFound) && !isAuthRoute) {
      if (typeof window !== "undefined") {
        const publicRoutes = ["/", "/katalog", "/produk", "/toko"];
        const isPublicPath = publicRoutes.some(
          (p) =>
            window.location.pathname === p ||
            (p !== "/" && window.location.pathname.startsWith(p)),
        );
        const isGuestChat =
          window.location.pathname.startsWith("/chat/guest") ||
          (window.location.pathname.startsWith("/chat/") &&
            !!localStorage.getItem("guest_token"));

        useAuthStore.getState().clearAuth();

        if (!isPublicPath && !isGuestChat) {
          window.location.href = "/";
        }
      }
    }

    if (error.response?.data?.message) {
      error.message = Array.isArray(error.response.data.message)
        ? error.response.data.message.join(", ")
        : error.response.data.message;
    }

    return Promise.reject(error);
  },
);
