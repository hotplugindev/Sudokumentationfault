import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "@/api";

interface User {
  id: string;
  username: string;
}

export const useAuthStore = defineStore("auth", () => {
  /* ── State ─────────────────────────────────────────────────────────── */

  const token = ref<string | null>(localStorage.getItem("token"));
  const user = ref<User | null>(
    JSON.parse(localStorage.getItem("user") || "null"),
  );

  /* ── Getters ───────────────────────────────────────────────────────── */

  const isLoggedIn = computed(() => !!token.value && !!user.value);

  /* ── Actions ───────────────────────────────────────────────────────── */

  function setSession(newToken: string, newUser: User) {
    token.value = newToken;
    user.value = newUser;
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
  }

  function clearSession() {
    token.value = null;
    user.value = null;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  async function login(username: string, password: string) {
    const { data } = await api.post("/auth/login", { username, password });
    setSession(data.token, data.user);
    return data.user;
  }

  async function register(username: string, password: string) {
    const { data } = await api.post("/auth/register", { username, password });
    setSession(data.token, data.user);
    return data.user;
  }

  async function checkAuth(): Promise<boolean> {
    if (!token.value) return false;
    try {
      const { data } = await api.get("/auth/me");
      user.value = data.user;
      return true;
    } catch {
      clearSession();
      return false;
    }
  }

  function logout() {
    clearSession();
  }

  return { token, user, isLoggedIn, login, register, logout, checkAuth };
});
