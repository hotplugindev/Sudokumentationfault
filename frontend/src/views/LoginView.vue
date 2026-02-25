<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const router = useRouter();

const username = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

async function handleLogin() {
  error.value = "";
  loading.value = true;

  try {
    await auth.login(username.value, password.value);
    router.push("/");
  } catch (err: any) {
    error.value = err.response?.data?.error || "Login failed";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card card">
      <div class="auth-header">
        <span class="auth-icon">◧</span>
        <h1>Welcome back</h1>
        <p>Sign in to continue playing</p>
      </div>

      <form class="auth-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            class="input"
            placeholder="Enter your username"
            autocomplete="username"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="input"
            placeholder="Enter your password"
            autocomplete="current-password"
            required
          />
        </div>

        <p v-if="error" class="error-text">{{ error }}</p>

        <button
          type="submit"
          class="btn btn-primary auth-submit"
          :disabled="loading"
        >
          {{ loading ? "Signing in..." : "Sign In" }}
        </button>
      </form>

      <p class="auth-footer">
        Don't have an account?
        <RouterLink to="/register">Create one</RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.auth-card {
  width: 100%;
  max-width: 380px;
}

.auth-header {
  text-align: center;
  margin-bottom: 28px;
}

.auth-icon {
  font-size: 2.4rem;
  color: var(--accent);
  display: block;
  margin-bottom: 12px;
}

.auth-header h1 {
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.auth-header p {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-submit {
  width: 100%;
  margin-top: 4px;
  padding: 12px;
}

.auth-footer {
  text-align: center;
  margin-top: 20px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}
</style>
