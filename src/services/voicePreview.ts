const PREVIEW_TEXT_BY_LANGUAGE: Record<string, string> = {
  en: "The sun rises in the east, and sets in the west.\n\nThe colours of the sky fade with the setting sun.",
  es: "El sol sale por el este y se pone por el oeste.\n\nLos colores del cielo se desvanecen con la puesta de sol.",
  fr: "Le soleil se lève à l'est et se couche à l'ouest.\n\nLes couleurs du ciel s'estompent avec le soleil couchant.",
  de: "Die Sonne geht im Osten auf und im Westen unter.\n\nDie Farben des Himmels verblassen mit der untergehenden Sonne.",
};

export const getVoicePreviewScript = (language?: string) =>
  PREVIEW_TEXT_BY_LANGUAGE[language ?? ""] ?? PREVIEW_TEXT_BY_LANGUAGE.en;
