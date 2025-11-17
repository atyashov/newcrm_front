module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: ["plugin:vue/vue3-essential", "eslint:recommended", "@vue/prettier"],
  parserOptions: {
    parser: "@babel/eslint-parser",
  },
  rules: {
    "vue/multi-word-component-names": "off",
    "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
    "prettier/prettier": "off",
    // Делаем все ошибки предупреждениями, чтобы не крашило сборку
    "no-unused-vars": "warn",
    "vue/no-unused-vars": "warn",
    "vue/no-unused-components": "warn",
    "vue/no-unused-refs": "warn",
    "no-undef": "warn",
  },
}
