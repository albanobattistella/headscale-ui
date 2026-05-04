import { createRouter, createWebHistory } from "vue-router";
import DashboardView from "@/views/DashboardView.vue";

export const routes = [
  {
    path: "/",
    name: "login",
    component: DashboardView,
  },
  {
    path: "/:profileId/:group?",
    name: "profile",
    component: DashboardView,
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
