/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_OPENROUTESERVICE_API_KEY?: string;
  readonly VITE_OPENROUTE_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    google?: any;
  }
  namespace google {
    namespace maps {
      namespace places {
        type Autocomplete = any;
        type PlaceResult = any;
      }
      type event = any;
    }
  }
}

