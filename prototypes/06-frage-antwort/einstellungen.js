// Die Einstellungen: wählt das Geräteprofil aus config.js, füllt damit die Regler,
// liest die Regler wieder aus und gibt ihre Werte als Config-Text zurück.
//
// Grundsatz: Jeder Name in CONFIG.base ist zugleich die id eines Reglers in index.html.
// Deshalb kommen Befüllen und Auslesen ohne eine zweite Liste aus.

// Mit "?profil=handy" in der Adresse lässt sich ein Profil erzwingen (zum Ausprobieren am Rechner).
const PROFILE_URL_PARAMETER = "profil";

// Der Name des Profils, mit dessen Werten die Regler zuletzt gefüllt wurden.
let activeProfileName = "";

// Welches Profil zur Fensterbreite passt.
function profileNameForWidth(config, windowWidth) {
  return windowWidth >= config.desktopFromWidth ? "desktop" : "handy";
}

// Das in der Adresse gewünschte Profil - oder null, wenn dort keines (oder ein unbekanntes) steht.
function profileNameFromUrl(config) {
  const wished = new URLSearchParams(window.location.search).get(PROFILE_URL_PARAMETER);
  return config.profiles[wished] ? wished : null;
}

// Mit "?seed=123" in der Adresse lässt sich der Zufalls-Startwert festlegen - auch in der
// Besucherfassung, die keine Regler zeigt. So lässt sich ein Labyrinth 1:1 wieder aufrufen.
const SEED_URL_PARAMETER = "seed";

// Der Startwert aus einer Adresszeile wie "?seed=123" - oder null, wenn dort keiner oder
// keine ganze Zahl ab 0 steht.
function seedFromQuery(query) {
  const wished = new URLSearchParams(query).get(SEED_URL_PARAMETER);
  const isWholeNumber = /^\d+$/.test(wished || "");
  return isWholeNumber ? Number(wished) : null;
}

// Der Startwert aus der Adresse dieser Seite (siehe seedFromQuery).
function seedFromUrl() {
  return seedFromQuery(window.location.search);
}

// Alle Werte eines Profils:die Grundwerte, überschrieben mit den Abweichungen des Profils.
function valuesOfProfile(config, profileName) {
  return { ...config.base, ...config.profiles[profileName] };
}

// Setzt einen Regler auf einen Wert. Ankreuzfelder bekommen wahr/falsch, alle anderen den Wert als Text.
function setControlValue(control, value) {
  if (control.type === "checkbox") control.checked = Boolean(value);
  else control.value = String(value);
}

// Liest einen Regler im passenden Typ aus: Ankreuzfeld -> wahr/falsch,
// Schieberegler und Zahlenfeld -> Zahl, alles andere -> Text.
function controlValue(control) {
  if (control.type === "checkbox") return control.checked;
  if (control.type === "range" || control.type === "number") return Number(control.value);
  return control.value;
}

// Macht ein Profil zum aktiven: füllt alle Regler mit seinen Werten und merkt sich den
// Namen. Das Layout richtet sich über body[data-profile] ebenfalls nach dem Profil.
// Steht in der Adresse ein Startwert (?seed=…), gilt er statt des Werts aus dem Profil.
function applyProfile(config, profileName) {
  activeProfileName = profileName;
  document.body.dataset.profile = profileName;

  for (const [name, value] of Object.entries(valuesOfProfile(config, profileName))) {
    const control = document.getElementById(name);
    if (control) setControlValue(control, value);
  }

  const seedInUrl = seedFromUrl();
  if (seedInUrl !== null) setControlValue(document.getElementById("seed"), seedInUrl);
}

// Die Werte, wie sie jetzt gerade gelten: für jeden Namen aus CONFIG.base der Stand
// seines Reglers. Namen ohne Regler (controlsOpen) behalten den Wert aus dem aktiven Profil.
function currentValues(config) {
  const values = valuesOfProfile(config, activeProfileName);
  for (const name of Object.keys(config.base)) {
    const control = document.getElementById(name);
    if (control) values[name] = controlValue(control);
  }
  return values;
}

// Liest alle Regler in das Objekt, mit dem Labyrinth und Zeichnung arbeiten.
// Prozentwerte der Regler (0 bis 100) werden dabei zu Anteilen (0 bis 1).
function readSettings() {
  const values = currentValues(CONFIG);
  const asFraction = [
    "windiness", "detour", "returnWindiness", "restBrightness", "connectorOpacity",
    "bloomStrength", "scanlineStrength", "vignetteStrength", "flickerStrength",
  ];
  for (const name of asFraction) values[name] = values[name] / 100;
  return values;
}

// Schreibt die Werte als fertigen Profil-Block für config.js auf. Aufgeführt werden nur
// die Werte, die von den Grundwerten abweichen - genau so sind die Profile dort notiert.
// `note` ist eine Kommentarzeile, die über dem Block steht (z. B. Datum und Bildschirmgröße).
function configTextOf(config, profileName, values, note) {
  const differingLines = Object.keys(config.base)
    .filter((name) => values[name] !== config.base[name])
    .map((name) => `      ${name}: ${JSON.stringify(values[name])},`);

  return [`    // ${note}`, `    ${profileName}: {`, ...differingLines, `    },`].join("\n");
}

// Kopiert über den alten Weg: Text im Textfeld markieren und den Browser "kopieren" lassen.
// Liefert, ob das geklappt hat.
function copyBySelection(textarea) {
  textarea.focus();
  textarea.select();
  try {
    return document.execCommand("copy");
  } catch (error) {
    return false;
  }
}

// Kopiert den Inhalt des Textfelds in die Zwischenablage. Erst über die moderne
// Schnittstelle; die gibt es nicht überall (z. B. nicht bei jeder lokal geöffneten Datei),
// dann über das Markieren. Liefert ein Versprechen mit wahr/falsch: hat es geklappt?
function copyToClipboard(textarea) {
  const hasClipboard = navigator.clipboard && navigator.clipboard.writeText;
  if (!hasClipboard) return Promise.resolve(copyBySelection(textarea));

  return navigator.clipboard.writeText(textarea.value).then(
    () => true,
    () => copyBySelection(textarea)
  );
}
