// No-op stand-in for Next's `server-only` guard, used ONLY when running scripts
// under tsx (outside the Next bundler). The real guard throws if a server module
// is imported into a client bundle; in a plain Node script there is no client
// bundle, so an empty module is the correct behavior. Mapped via tsconfig.scripts.json.
export {};
