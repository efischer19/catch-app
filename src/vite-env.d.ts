/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOLD_CDN_BASE_URL?: string;
  readonly VITE_GOLD_FETCH_TIMEOUT_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
