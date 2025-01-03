import js from "@eslint/js";
import globals from "globals";

/** @type {import('eslint').Linter.Config[]} */
export default [
  js.configs.recommended,
  {
    languageOptions: { globals: globals.node },
    rules: {
      "prefer-const": "warn",
      "no-console": "off",
      "no-unused-vars": "warn",
    },
  },
];
