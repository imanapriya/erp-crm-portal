import axios from "axios";

// In production, set VITE_API_URL to your deployed backend's URL (see README).
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("erp_crm_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("erp_crm_token");
      localStorage.removeItem("erp_crm_user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

/** Extracts a human-readable message from an Axios error, falling back sensibly. */
export function apiErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; details?: Array<{ field: string; message: string }> } | undefined;
    if (data?.details && Array.isArray(data.details) && data.details.length > 0) {
      return data.details.map((d) => `${d.field}: ${d.message}`).join(", ");
    }
    if (data?.message) return data.message;
    if (err.message) return err.message;
  }
  return fallback;
}
