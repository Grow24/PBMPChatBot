/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_ENDPOINT?: string
  readonly VITE_VOICE_ENDPOINT?: string
  readonly VITE_MEDIA_ENDPOINT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
