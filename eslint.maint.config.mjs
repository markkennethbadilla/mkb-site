// Maintainability gate (register B13): size and complexity only; existing debt lives in eslint-suppressions.json.
import sonarjs from "eslint-plugin-sonarjs";
import tseslint from "typescript-eslint";

export default [
  { ignores: ["node_modules/**", ".next/**", "out/**", ".content-collections/**", "worker-configuration.d.ts", "next-env.d.ts", "**/*.cjs"] },
  { linterOptions: { reportUnusedDisableDirectives: "error" } },
  {
    files: ["**/*.{js,mjs,ts,tsx}"],
    languageOptions: { parser: tseslint.parser, ecmaVersion: "latest", sourceType: "module", parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { sonarjs },
    rules: {
      "max-lines": ["error", { max: 500, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: 120, skipBlankLines: true, skipComments: true }],
      complexity: ["error", 20],
      "max-depth": ["error", 5],
      "sonarjs/cognitive-complexity": ["error", 15],
      "sonarjs/no-identical-functions": "error",
      "sonarjs/no-commented-code": "error",
      "no-restricted-syntax": ["error", { selector: "CallExpression[callee.property.name=/^(skip|only|todo)$/][callee.object.name=/^(test|it|describe)$/]", message: "No skipped or focused tests: fix or delete it." }],
      "no-warning-comments": ["error", { terms: ["todo", "fixme", "hack"] }],
    },
  },
];
