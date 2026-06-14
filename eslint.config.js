// ESLint 9 flat config. Two file groups: the UXP panel runtime (browser + UXP
// globals) and the Node-side tooling/tests.
const js = require("@eslint/js");

const panelGlobals = {
  require: "readonly",
  module: "writable",
  document: "readonly",
  window: "readonly",
  globalThis: "readonly",
  console: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  RatioCore: "readonly"
};

const nodeGlobals = {
  require: "readonly",
  module: "writable",
  __dirname: "readonly",
  process: "readonly",
  console: "readonly",
  Buffer: "readonly",
  globalThis: "readonly"
};

module.exports = [
  { ignores: ["node_modules/**"] },
  js.configs.recommended,
  {
    rules: {
      "no-unused-vars": ["error", { caughtErrors: "none", argsIgnorePattern: "^_" }]
    }
  },
  {
    // Panel runtime (also matches ratio.js, which is shared UMD).
    files: ["index.js", "ratio.js"],
    languageOptions: { ecmaVersion: 2021, sourceType: "script", globals: panelGlobals }
  },
  {
    // Node tooling + tests + config + the UMD module's Node export path.
    files: ["ratio.js", "tools/**/*.js", "test/**/*.js", "eslint.config.js"],
    languageOptions: { ecmaVersion: 2021, sourceType: "script", globals: nodeGlobals }
  }
];
