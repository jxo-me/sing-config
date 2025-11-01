import { createApp } from "vue";
import App from "./App.vue";
import { initTheme } from "./lib/theme";

// 初始化主题系统（固定使用浅色主题）
initTheme();

createApp(App).mount("#app");
