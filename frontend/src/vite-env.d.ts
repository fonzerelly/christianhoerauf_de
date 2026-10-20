/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Adresse des Backends; leer oder nicht gesetzt: die Seite antwortet aus `content.json`. */
  readonly VITE_ANSWER_URL?: string;
}
