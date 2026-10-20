import type { ProfileName } from "../config/tuning";

/** Was die Adresse der Seite verändern darf. Fehlende oder ungültige Angaben fehlen hier. */
export interface UrlParameters {
  /** `?seed=123`: der Startwert der Begrüßung. Eine ganze Zahl ab 0. */
  readonly seed?: number;
  /** `?profil=handy` oder `?profil=desktop`: erzwingt das Geräteprofil. */
  readonly profile?: ProfileName;
}

const PROFILE_NAMES: readonly string[] = ["desktop", "handy"];

/** Liest die Adress-Parameter aus dem Suchteil der Adresse (`window.location.search`). */
export function readUrlParameters(query: string): UrlParameters {
  const parameters = new URLSearchParams(query);
  const seed = parameters.get("seed");
  const profile = parameters.get("profil");

  return {
    ...(seed !== null && /^\d+$/.test(seed) ? { seed: Number(seed) } : {}),
    ...(profile !== null && PROFILE_NAMES.includes(profile)
      ? { profile: profile as ProfileName }
      : {}),
  };
}
