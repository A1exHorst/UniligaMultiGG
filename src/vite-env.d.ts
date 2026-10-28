/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPL_PROXY_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
