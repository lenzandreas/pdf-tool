const en = {
  appName: 'PDF Tool',
  tagline: 'Edit PDFs right in your browser. Your files never leave your device.',
  privacyBadge: 'Processed locally, nothing is uploaded',
  home: 'All tools',
  language: 'Language',
  footer: 'Open source (MIT). All processing happens in this browser tab; the server only delivers the app.',
  sourceCode: 'Source code',

  // shared
  dropPdf: 'Drop PDF files here or click to choose',
  dropOnePdf: 'Drop a PDF here or click to choose',
  dropImages: 'Drop images (JPG, PNG, WebP, …) here or click to choose',
  addMore: 'Add files',
  clear: 'Start over',
  pages: 'pages',
  page: 'Page',
  remove: 'Remove',
  moveUp: 'Move up',
  moveDown: 'Move down',
  working: 'Working…',
  done: 'Done. Your download has started.',
  downloadAgain: 'Download again',
  errorGeneric: 'Something went wrong: {msg}',
  errorInvalid: '“{name}” could not be read as a PDF.',
  errorEncrypted:
    '“{name}” is password protected or encrypted. Tip: “Blacken” with “Flatten all pages” can make an unprotected copy.',
  errorPages: 'Invalid page selection “{part}”. Use numbers and ranges such as 1-3, 5, 8-.',
  errorPagesEmpty: 'Please enter which pages you want.',
  fileReading: 'Reading {name}…',
  pageOf: 'Page {n} of {total}',
  selectAll: 'Select all',
  selectNone: 'Select none',
  outputName: 'File name',

  // merge
  mergeTitle: 'Merge',
  mergeDesc: 'Combine several PDFs into one, in the order you choose.',
  mergeButton: 'Merge and download',
  mergeNeedTwo: 'Add at least two PDF files.',
  mergeHint: 'Optionally limit the pages of each file, e.g. “1-3, 7”. Leave empty for all pages.',
  mergePagesPlaceholder: 'all pages',

  // split
  splitTitle: 'Split',
  splitDesc: 'Cut a PDF into parts or pull out selected pages.',
  splitMode: 'How do you want to split?',
  splitEach: 'Every page as its own PDF',
  splitEvery: 'Every {n} pages',
  splitRanges: 'Custom parts (each comma separated range becomes one file)',
  splitExtract: 'Extract selected pages into one PDF',
  splitRangesPlaceholder: 'e.g. 1-3, 4-6, 7-',
  splitExtractPlaceholder: 'e.g. 1, 3, 5-7',
  splitButton: 'Split and download',
  splitResult: '{n} files created. They were downloaded as one ZIP archive.',
  splitHint: 'Tip: click pages below to select them.',

  // redact
  redactTitle: 'Blacken',
  redactDesc: 'Black out text and images for good. Covered content is removed, not just hidden.',
  redactHowTitle: 'How it works',
  redactHow:
    'Drag on a page to draw a box, black or white (choose the colour above the pages). Click a box to remove it. Every page with a box is turned into an image with the boxes burned in, so the covered text can never be selected, copied or recovered. Pages without boxes stay unchanged. The result is a brand-new file without the original metadata, bookmarks, attachments or edit history.',
  redactSearch: 'Find and mark text',
  redactSearchPlaceholder: 'Name, number, word…',
  redactSearchButton: 'Mark matches',
  redactPresets: 'Also mark:',
  presetEmail: 'E-mail addresses',
  presetIban: 'IBANs',
  presetPhone: 'Phone numbers',
  redactFound: '{n} areas marked. Please check them on the pages below.',
  redactFoundNone: 'No matches found. Scanned pages contain no text and must be marked by hand.',
  redactClearAll: 'Remove all boxes',
  redactWholePage: 'Black out whole page',
  redactDraw: 'Draw boxes with finger',
  redactColor: 'Box colour:',
  colorBlack: 'Black',
  colorWhite: 'White',
  redactBoxes: '{n} boxes on {p} pages',
  redactFlattenAll: 'Flatten all pages (also hides text on pages without boxes; makes the file non-searchable)',
  redactQuality: 'Quality of flattened pages',
  redactQualityLow: 'Smaller file (150 dpi)',
  redactQualityMid: 'Balanced (200 dpi)',
  redactQualityHigh: 'High (300 dpi)',
  redactFormat: 'Lossless images (PNG, larger file)',
  redactButton: 'Blacken and download',
  redactNothing: 'Draw at least one box, or choose “Flatten all pages”.',
  redactEncrypted: 'This PDF is protected, so all pages will be flattened.',
  redactPassword: 'This PDF needs a password to open.',
  redactPasswordWrong: 'Wrong password, please try again.',
  redactPasswordButton: 'Open',
  redactProgress: 'Flattening page {n} of {total}…',
  redactCheck:
    'Check the result before you share it: open it, try to select or search the blackened text, and make sure nothing important is left visible.',

  // organize
  organizeTitle: 'Organize pages',
  organizeDesc: 'Reorder, rotate, delete or duplicate pages, also across several files.',
  organizeHint: 'Drag pages to reorder them. Use the buttons on each page to rotate, duplicate or delete it.',
  rotateLeft: 'Rotate left',
  rotateRight: 'Rotate right',
  duplicate: 'Duplicate',
  rotateAllLeft: 'Rotate all left',
  rotateAllRight: 'Rotate all right',
  reverse: 'Reverse order',
  organizeButton: 'Save and download',
  organizeEmpty: 'There are no pages left.',

  // images to pdf
  imagesTitle: 'Images to PDF',
  imagesDesc: 'Turn photos and scans into a single PDF.',
  imagesPageSize: 'Page size',
  sizeFit: 'Same as image',
  sizeA4: 'A4',
  sizeLetter: 'US Letter',
  imagesButton: 'Create PDF',
  imagesUnsupported: '“{name}” is not an image this browser can read.',

  // pdf to images
  exportTitle: 'PDF to images',
  exportDesc: 'Save every page as a PNG or JPG picture.',
  exportFormat: 'Format',
  exportDpi: 'Resolution',
  exportButton: 'Convert and download',
  exportPagesLabel: 'Pages (empty = all)',

  // numbers
  numbersTitle: 'Page numbers',
  numbersDesc: 'Stamp page numbers onto every page.',
  numbersPosition: 'Position',
  posBottomCenter: 'Bottom centre',
  posBottomRight: 'Bottom right',
  posBottomLeft: 'Bottom left',
  posTopCenter: 'Top centre',
  posTopRight: 'Top right',
  posTopLeft: 'Top left',
  numbersPattern: 'Format',
  numbersPatternHint: '{n} is the page number, {total} the last number.',
  numbersStart: 'First number',
  numbersSize: 'Font size',
  numbersPages: 'Pages to number (empty = all)',
  numbersButton: 'Add numbers and download',

  // metadata
  metaTitle: 'Metadata',
  metaDesc: 'View, edit or remove hidden document information such as author and title.',
  metaFieldTitle: 'Title',
  metaFieldAuthor: 'Author',
  metaFieldSubject: 'Subject',
  metaFieldKeywords: 'Keywords',
  metaFieldCreator: 'Created with',
  metaFieldProducer: 'Produced by',
  metaFieldCreated: 'Created',
  metaFieldModified: 'Modified',
  metaSave: 'Save changes and download',
  metaStrip: 'Remove all metadata and download',
  metaHint: 'Saving always writes a fresh file: hidden XMP data, bookmarks, attachments and earlier revisions are dropped.',
};

export type Key = keyof typeof en;

const de: Record<Key, string> = {
  appName: 'PDF-Tool',
  tagline: 'PDFs direkt im Browser bearbeiten. Deine Dateien verlassen nie dein Gerät.',
  privacyBadge: 'Lokale Verarbeitung, kein Upload',
  home: 'Alle Werkzeuge',
  language: 'Sprache',
  footer: 'Open Source (MIT). Alles wird in diesem Browser-Tab verarbeitet; der Server liefert nur die App aus.',
  sourceCode: 'Quellcode',

  dropPdf: 'PDF-Dateien hier ablegen oder klicken zum Auswählen',
  dropOnePdf: 'PDF hier ablegen oder klicken zum Auswählen',
  dropImages: 'Bilder (JPG, PNG, WebP, …) hier ablegen oder klicken zum Auswählen',
  addMore: 'Dateien hinzufügen',
  clear: 'Neu beginnen',
  pages: 'Seiten',
  page: 'Seite',
  remove: 'Entfernen',
  moveUp: 'Nach oben',
  moveDown: 'Nach unten',
  working: 'Wird verarbeitet…',
  done: 'Fertig. Der Download wurde gestartet.',
  downloadAgain: 'Erneut herunterladen',
  errorGeneric: 'Etwas ist schiefgelaufen: {msg}',
  errorInvalid: '„{name}“ konnte nicht als PDF gelesen werden.',
  errorEncrypted:
    '„{name}“ ist passwortgeschützt oder verschlüsselt. Tipp: „Schwärzen“ mit „Alle Seiten umwandeln“ erstellt eine ungeschützte Kopie.',
  errorPages: 'Ungültige Seitenangabe „{part}“. Verwende Zahlen und Bereiche wie 1-3, 5, 8-.',
  errorPagesEmpty: 'Bitte gib an, welche Seiten du möchtest.',
  fileReading: '{name} wird gelesen…',
  pageOf: 'Seite {n} von {total}',
  selectAll: 'Alle auswählen',
  selectNone: 'Keine auswählen',
  outputName: 'Dateiname',

  mergeTitle: 'Zusammenfügen',
  mergeDesc: 'Mehrere PDFs in der gewünschten Reihenfolge zu einem verbinden.',
  mergeButton: 'Zusammenfügen und herunterladen',
  mergeNeedTwo: 'Füge mindestens zwei PDF-Dateien hinzu.',
  mergeHint: 'Optional die Seiten je Datei einschränken, z. B. „1-3, 7“. Leer lassen für alle Seiten.',
  mergePagesPlaceholder: 'alle Seiten',

  splitTitle: 'Aufteilen',
  splitDesc: 'Ein PDF in Teile zerlegen oder einzelne Seiten herausziehen.',
  splitMode: 'Wie möchtest du aufteilen?',
  splitEach: 'Jede Seite als eigenes PDF',
  splitEvery: 'Alle {n} Seiten',
  splitRanges: 'Eigene Teile (jeder durch Komma getrennte Bereich wird eine Datei)',
  splitExtract: 'Ausgewählte Seiten in ein PDF übernehmen',
  splitRangesPlaceholder: 'z. B. 1-3, 4-6, 7-',
  splitExtractPlaceholder: 'z. B. 1, 3, 5-7',
  splitButton: 'Aufteilen und herunterladen',
  splitResult: '{n} Dateien erstellt. Sie wurden als ZIP-Archiv heruntergeladen.',
  splitHint: 'Tipp: Klicke unten auf Seiten, um sie auszuwählen.',

  redactTitle: 'Schwärzen',
  redactDesc: 'Text und Bilder endgültig schwärzen. Abgedeckte Inhalte werden entfernt, nicht nur versteckt.',
  redactHowTitle: 'So funktioniert es',
  redactHow:
    'Ziehe auf einer Seite, um einen Balken zu zeichnen, schwarz oder weiß (Farbe über den Seiten wählen). Klicke auf einen Balken, um ihn zu entfernen. Jede Seite mit Balken wird in ein Bild umgewandelt, in das die Balken eingebrannt sind. Der abgedeckte Text lässt sich danach weder markieren noch kopieren oder wiederherstellen. Seiten ohne Balken bleiben unverändert. Das Ergebnis ist eine neue Datei ohne die ursprünglichen Metadaten, Lesezeichen, Anhänge oder Bearbeitungsstände.',
  redactSearch: 'Text suchen und markieren',
  redactSearchPlaceholder: 'Name, Nummer, Wort…',
  redactSearchButton: 'Treffer markieren',
  redactPresets: 'Außerdem markieren:',
  presetEmail: 'E-Mail-Adressen',
  presetIban: 'IBANs',
  presetPhone: 'Telefonnummern',
  redactFound: '{n} Stellen markiert. Bitte prüfe sie unten auf den Seiten.',
  redactFoundNone: 'Keine Treffer. Gescannte Seiten enthalten keinen Text und müssen von Hand markiert werden.',
  redactClearAll: 'Alle Balken entfernen',
  redactWholePage: 'Ganze Seite schwärzen',
  redactDraw: 'Balken mit dem Finger zeichnen',
  redactColor: 'Balkenfarbe:',
  colorBlack: 'Schwarz',
  colorWhite: 'Weiß',
  redactBoxes: '{n} Balken auf {p} Seiten',
  redactFlattenAll: 'Alle Seiten umwandeln (versteckt auch Text auf Seiten ohne Balken; die Datei ist dann nicht mehr durchsuchbar)',
  redactQuality: 'Qualität der umgewandelten Seiten',
  redactQualityLow: 'Kleinere Datei (150 dpi)',
  redactQualityMid: 'Ausgewogen (200 dpi)',
  redactQualityHigh: 'Hoch (300 dpi)',
  redactFormat: 'Verlustfreie Bilder (PNG, größere Datei)',
  redactButton: 'Schwärzen und herunterladen',
  redactNothing: 'Zeichne mindestens einen Balken oder wähle „Alle Seiten umwandeln“.',
  redactEncrypted: 'Dieses PDF ist geschützt, daher werden alle Seiten umgewandelt.',
  redactPassword: 'Dieses PDF benötigt ein Passwort.',
  redactPasswordWrong: 'Falsches Passwort, bitte erneut versuchen.',
  redactPasswordButton: 'Öffnen',
  redactProgress: 'Seite {n} von {total} wird umgewandelt…',
  redactCheck:
    'Prüfe das Ergebnis, bevor du es weitergibst: Öffne es, versuche den geschwärzten Text zu markieren oder zu suchen, und stelle sicher, dass nichts Wichtiges sichtbar bleibt.',

  organizeTitle: 'Seiten ordnen',
  organizeDesc: 'Seiten sortieren, drehen, löschen oder verdoppeln, auch über mehrere Dateien.',
  organizeHint: 'Ziehe Seiten, um sie umzusortieren. Mit den Knöpfen auf jeder Seite drehst, verdoppelst oder löschst du sie.',
  rotateLeft: 'Nach links drehen',
  rotateRight: 'Nach rechts drehen',
  duplicate: 'Verdoppeln',
  rotateAllLeft: 'Alle nach links drehen',
  rotateAllRight: 'Alle nach rechts drehen',
  reverse: 'Reihenfolge umkehren',
  organizeButton: 'Speichern und herunterladen',
  organizeEmpty: 'Es sind keine Seiten mehr übrig.',

  imagesTitle: 'Bilder zu PDF',
  imagesDesc: 'Fotos und Scans zu einem PDF zusammenfassen.',
  imagesPageSize: 'Seitengröße',
  sizeFit: 'Wie das Bild',
  sizeA4: 'A4',
  sizeLetter: 'US Letter',
  imagesButton: 'PDF erstellen',
  imagesUnsupported: '„{name}“ ist kein Bild, das dieser Browser lesen kann.',

  exportTitle: 'PDF zu Bildern',
  exportDesc: 'Jede Seite als PNG- oder JPG-Bild speichern.',
  exportFormat: 'Format',
  exportDpi: 'Auflösung',
  exportButton: 'Umwandeln und herunterladen',
  exportPagesLabel: 'Seiten (leer = alle)',

  numbersTitle: 'Seitenzahlen',
  numbersDesc: 'Seitenzahlen auf jede Seite drucken.',
  numbersPosition: 'Position',
  posBottomCenter: 'Unten mittig',
  posBottomRight: 'Unten rechts',
  posBottomLeft: 'Unten links',
  posTopCenter: 'Oben mittig',
  posTopRight: 'Oben rechts',
  posTopLeft: 'Oben links',
  numbersPattern: 'Format',
  numbersPatternHint: '{n} ist die Seitenzahl, {total} die letzte Zahl.',
  numbersStart: 'Erste Zahl',
  numbersSize: 'Schriftgröße',
  numbersPages: 'Zu nummerierende Seiten (leer = alle)',
  numbersButton: 'Nummerieren und herunterladen',

  metaTitle: 'Metadaten',
  metaDesc: 'Versteckte Dokumentinformationen wie Autor und Titel ansehen, ändern oder entfernen.',
  metaFieldTitle: 'Titel',
  metaFieldAuthor: 'Autor',
  metaFieldSubject: 'Betreff',
  metaFieldKeywords: 'Stichwörter',
  metaFieldCreator: 'Erstellt mit',
  metaFieldProducer: 'Erzeugt von',
  metaFieldCreated: 'Erstellt am',
  metaFieldModified: 'Geändert am',
  metaSave: 'Änderungen speichern und herunterladen',
  metaStrip: 'Alle Metadaten entfernen und herunterladen',
  metaHint: 'Beim Speichern entsteht immer eine neue Datei: versteckte XMP-Daten, Lesezeichen, Anhänge und frühere Bearbeitungsstände entfallen.',
};

export type Lang = 'de' | 'en';
const dictionaries: Record<Lang, Record<Key, string>> = { de, en };

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('pdf-tool-lang');
    if (saved === 'de' || saved === 'en') return saved;
  } catch {
    /* storage may be blocked */
  }
  return (navigator.language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en';
}

let lang: Lang = initialLang();

export function getLang(): Lang {
  return lang;
}

export function setLang(next: Lang): void {
  lang = next;
  try {
    localStorage.setItem('pdf-tool-lang', next);
  } catch {
    /* ignore */
  }
  document.documentElement.lang = next;
}

/** Translates a key and fills {placeholders}. */
export function t(key: Key, vars: Record<string, string | number> = {}): string {
  let s = dictionaries[lang][key];
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
