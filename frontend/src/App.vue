<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import NavBar from "@/components/NavBar.vue";

const auth = useAuthStore();
</script>

<template>
    <div class="app-shell">
        <NavBar v-if="auth.isLoggedIn" />
        <main class="app-main">
            <RouterView />
        </main>
    </div>
</template>

<style scoped>
.app-shell {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary);
}

.app-main {
    flex: 1;
    display: flex;
    flex-direction: column;
}
</style>
