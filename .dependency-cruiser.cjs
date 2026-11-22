// Maintainability gate (register B13); existing violations live in .dependency-cruiser-known-violations.json.
module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    { name: "not-to-unresolvable", severity: "error", from: {}, to: { couldNotResolve: true, pathNot: "^(cloudflare:|@cloudflare/vitest-plugin/types)" } }, // workerd virtual modules and a types-only entry
    { name: "no-non-package-json", severity: "error", from: {}, to: { dependencyTypes: ["npm-no-pkg", "npm-unknown"] } },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: { exportsFields: ["exports"], conditionNames: ["import", "require", "node", "default"], mainFields: ["module", "main"] },
    exclude: { path: "(^|/)(node_modules|\\.next|\\.content-collections|out)/" },
  },
};
