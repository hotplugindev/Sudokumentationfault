import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "game",
      component: () => import("@/views/GameView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/dashboard",
      name: "dashboard",
      component: () => import("@/views/DashboardView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/LoginView.vue"),
      meta: { guest: true },
    },
    {
      path: "/register",
      name: "register",
      component: () => import("@/views/RegisterView.vue"),
      meta: { guest: true },
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: "/",
    },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();

  /* If we have a token but haven't verified it yet this session, check it */
  if (auth.token && !auth.user) {
    await auth.checkAuth();
  }

  /* Protected route — redirect unauthenticated users to login */
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: "login", query: { redirect: to.fullPath } };
  }

  /* Guest-only route — redirect authenticated users to home */
  if (to.meta.guest && auth.isLoggedIn) {
    return { name: "game" };
  }
});

export default router;
