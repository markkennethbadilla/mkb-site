import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'

const eslintConfig = defineConfig([
    ...nextVitals,
    // Override default ignores of eslint-config-next.
    globalIgnores([
        // Default ignores of eslint-config-next:
        '.next/**',
        'out/**',
        'build/**',
        'next-env.d.ts',

        // Generated, and nobody can act on a warning in a file they do not write.
        // Both of these were reporting warnings on every run: the content-collections
        // output tripped import/no-anonymous-default-export, and wrangler's generated
        // types carried four eslint-disable directives for rules that no longer fire.
        // Warnings on generated files are the ones that teach people to stop reading
        // lint output, which costs more than the rules buy.
        //
        // `wrangler types` rewrites worker-configuration.d.ts wholesale, so editing it
        // to silence the directives would not survive the next run.
        '.content-collections/**',
        'worker-configuration.d.ts',
    ]),
])

export default eslintConfig
