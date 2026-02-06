export const BASE_URL =
  import.meta.env?.VITE_BASE_URL || "http://localhost:3000";

export const API_URL = new URL("/api", BASE_URL).toString();
