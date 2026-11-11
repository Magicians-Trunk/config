# @magicians/config
Shared Magicians Trunk tooling config in a package.
## Supported baseline configs
See each config's documention for how to import/use/extend.

* `tsconfig.base.json` - TypeScript config, extended by every package and SERVICE.
* Lint and format - Oxlint and Oxfmt config for `vite.config.ts`, used by `vp lint` and `vp fmt`.
* Tests - Vitest config, with the 100% coverage thresholds.
* Python - `ruff.toml` and `pyrightconfig.json` bases, extended by each Python SERVICE.
* Check tasks - the cached build, typecheck and test tasks every package uses.

## Boundary Rule
`magicians/no-cross-service-imports` (an Oxlint plugin, on by default) fails any import of code from inside another SERVICE.  SERVICEs talk to each other over the wire: REST, MCP and the CLI.  Shared code belongs in a shared package.
