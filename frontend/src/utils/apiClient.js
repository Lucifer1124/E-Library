import axios from "axios";
import getBaseUrl from "./baseURL";

const apiClient = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;
