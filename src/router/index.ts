import { createRouter, createWebHistory, type RouteRecordRaw, type Router } from "vue-router";
import { profileStorage as storage } from "@/lib/profile-storage";

export const routes: RouteRecordRaw[] = [
  {
    path: "/login",
    name: "login",
    component: () => import("@/pages/LoginPage.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/",
    component: () => import("@/pages/AppLayout.vue"),
    meta: { requiresAuth: true },
    children: [
      { path: "", redirect: { name: "home" } },
      { path: "home", name: "home", component: () => import("@/pages/HomePage.vue") },
      { path: "devices", name: "devices", component: () => import("@/pages/DevicesPage.vue") },
      { path: "members", name: "members", component: () => import("@/pages/MembersPage.vue") },
      { path: "invites", name: "invites", component: () => import("@/pages/InvitesPage.vue") },
      { path: "routes", name: "routes", component: () => import("@/pages/RoutesPage.vue") },
      { path: "access", name: "access", component: () => import("@/pages/AccessPage.vue") },
    ],
  },
  {
    path: "/:profileId/:group(home|devices|members|invites|routes|access)?",
    redirect: (to) => ({
      path: `/${to.params.group || "home"}`,
      query: { profile: to.params.profileId as string },
    }),
  },
  { path: "/:pathMatch(.*)*", redirect: "/login" },
];

export function installAuthGuard(target: Router) {
  target.beforeEach((to) => {
    if (to.meta.requiresAuth === false) return true;

    const hasSession = storage.readActiveProfile() !== null && storage.hasAnyProfile();
    if (!hasSession) {
      return {
        name: "login",
        query: to.query.profile ? { profile: to.query.profile as string } : undefined,
      };
    }

    const requestedProfile = typeof to.query.profile === "string" ? to.query.profile : null;
    if (requestedProfile && !storage.hasProfile(requestedProfile)) {
      storage.clearActiveProfile();
      return { name: "login", query: { profile: requestedProfile } };
    }

    return true;
  });
}

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

installAuthGuard(router);
