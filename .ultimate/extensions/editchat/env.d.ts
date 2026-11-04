// Standalone typecheck only: the one `import.meta.hot` use inside `@/sdk`'s client, which
// Ultimate's own build types via vite-plus/client. Inert at runtime.
interface ImportMeta {
  readonly hot?: { accept(callback: () => void): void }
}
