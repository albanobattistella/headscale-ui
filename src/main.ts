import { createApp, h } from "vue";
import App from "./App.vue";
import ErrorScreen from "./components/ErrorScreen.vue";
import { i18n } from "./i18n";
import { hydrate } from "./lib/profile-storage";
import { router } from "./router";
import "./styles/globals.css";
import { useMasterPassword } from "./composables/useMasterPassword";

async function bootstrap() {
  console.info("[headscale-ui] bootstrap: hydrating profiles from IndexedDB");
  const mp = useMasterPassword();
  await mp.initialize();
  await hydrate({
    encryptLegacy: (plain) => mp.encryptWithDeviceKey(plain),
  });
  console.info("[headscale-ui] bootstrap: ready");
  createApp(App).use(i18n).use(router).mount("#app");
}

bootstrap().catch((err) => {
  console.error("[headscale-ui] bootstrap failed", err);
  createApp({
    render: () => h(ErrorScreen, { error: err }),
  }).mount("#app");
});
