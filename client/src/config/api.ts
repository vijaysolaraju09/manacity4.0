export const BASE_URL = import.meta.env.VITE_API_URL;
import axios from "axios";
export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
  timeout: 20000,
});
