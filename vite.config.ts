import { defineConfig } from "vite"
import { createHtmlPlugin } from "vite-plugin-html"
import vueDevTools from "vite-plugin-vue-devtools"

export default defineConfig({
  plugins: [
    // register vueDevTools before createHtmlPlugin
    vueDevTools(),
    createHtmlPlugin({}),
  ],
})
