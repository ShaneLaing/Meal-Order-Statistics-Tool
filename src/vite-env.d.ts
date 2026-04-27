/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_SCRIPT_WEB_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
