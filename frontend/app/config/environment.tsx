export const BASE_URL =
  import.meta.env?.VITE_BASE_URL || "https://url-is-todo.com";

export const API_URL = new URL("/api", BASE_URL).toString();
