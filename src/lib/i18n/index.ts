export type Locale = "en" | "es" | "fr" | "de";

export const DEFAULT_LOCALE: Locale = "en";

export const SUPPORTED_LOCALES: Locale[] = ["en", "es", "fr", "de"];

type MessageParams = Record<string, string | number>;

type Messages = Record<string, string>;

const MESSAGES: Record<Locale, Messages> = {
  en: {
    "ui.title": "Mental Fitness Practice Generator",
    "ui.version.loading": "Version: loading...",
    "ui.version.unavailable": "Version: unavailable",
    "ui.version.label": "Version: {version}",
    "ui.intro":
      "This tool generates short, guided mental fitness practices by focusing on physical sensations such as touch, sound, sight, or breathing.",
    "ui.description":
      "Choose the type of guided mental fitness practice you’d like to create.",
    "ui.ai_notice":
      "Audio is generated using artificial intelligence based on your selections.",
    "form.scenario_controls": "Scenario controls",
    "form.quick_access": "Quick access",
    "form.customize": "Customize",
    "form.options": "Options",
    "ui.footer":
      "Inspired by publicly available teachings on Positive Intelligence® and PQ Reps® by Shirzad Chamine. Not affiliated with or endorsed by Positive Intelligence LLC. For educational purposes only.",
    "form.practice_type": "Practice type",
    "form.practice_type.still_eyes_closed": "Still (Eyes closed)",
    "form.practice_type.still_eyes_open": "Still (Eyes open)",
    "form.practice_type.lying_eyes_closed": "Lying down (Eyes closed)",
    "form.practice_type.moving": "Moving",
    "form.practice_type.labeling": "Labeling",
    "scenario.calm_me_now": "Calm me now",
    "scenario.get_present_for_meeting": "Get present for a meeting",
    "scenario.start_the_thing_im_avoiding": "Start the thing I’m avoiding",
    "scenario.prepare_for_a_tough_conversation": "Prepare for a tough conversation",
    "scenario.reset_after_feedback": "Reset after feedback",
    "scenario.wind_down_for_sleep": "Wind down for sleep",
    "scenario.daily_deep_reset": "Daily deep reset",
    "form.focus": "Focus",
    "form.focus.touch": "Touch",
    "form.focus.hearing": "Hearing",
    "form.focus.sight": "Sight",
    "form.focus.breath": "Breath",
    "form.duration": "Duration",
    "form.duration.minutes": "{count} minute{suffix}",
    "form.language": "Language",
    "form.language_label": "Language:",
    "form.language.en": "English",
    "form.language.es": "Spanish",
    "form.language.fr": "French",
    "form.language.de": "German",
    "form.voice": "Voice",
    "form.voice.help": "Choose the voice you prefer for guidance.",
    "form.voice.preview": "Preview",
    "form.custom_scenario_line": "Custom scenario line (optional)",
    "form.custom_scenario_line.help":
      "Add a short, neutral context line (max {max} characters). No URLs or sensitive topics.",
    "form.audio_delivery": "Audio delivery",
    "form.audio_delivery.help":
      "Streaming starts playback sooner but can be less reliable on spotty connections and may limit seeking or offline replay.",
    "form.audio_delivery.generate": "Generate",
    "form.audio_delivery.stream": "Stream",
    "form.tts_newline_pause": "TTS newline pause (seconds)",
    "form.debug_tts_prompt": "Debug TTS prompt",
    "form.debug_tts_prompt.help":
      "Include the raw TTS payload for OpenAI playground testing.",
    "form.submit": "Prepare audio",
    "form.submit.loading": "Preparing audio…",
    "form.reset": "Reset to defaults",
    "status.preparing": "Preparing audio. This can take a few seconds.",
    "status.streaming_audio": "Streaming audio…",
    "status.generating_script": "Generating script…",
    "status.synthesizing_audio": "Synthesizing audio…",
    "result.title": "Your session is ready",
    "result.download_audio": "Download the audio",
    "result.download_text": "Download the text",
    "result.debug_title": "TTS prompt (debug)",
    "result.debug_copy": "Copy code",
    "result.debug_format": "Debug prompt format",
    "result.debug_format_json": "JSON",
    "result.debug_format_text": "Formatted text",
    "result.debug_field.model": "Model",
    "result.debug_field.voice": "Voice",
    "result.debug_field.response_format": "Response format",
    "result.debug_field.voice_style_preference": "Voice style preference",
    "result.debug_field.script_system_prompt": "Script system prompt",
    "result.debug_field.script_user_prompt": "Script user prompt",
    "result.debug_field.tts_system_prompt": "TTS system prompt",
    "result.debug_field.input": "Input",
    "errors.unknown": "Something went wrong.",
    "errors.generator_failed": "The generator failed to respond.",
    "errors.generator_failed_status": "The generator failed to respond. ({status})",
    "errors.streaming_unavailable": "Streaming updates are not available.",
    "errors.stream_ended": "The stream ended before returning a response.",
    "errors.streaming_failed": "Streaming failed.",
    "errors.audio_stream_failed": "Audio stream failed.",
    "errors.append_audio_chunk_failed": "Failed to append audio chunk.",
    "errors.audio_stream_no_data": "Audio stream ended before data arrived.",
    "errors.preview_failed": "Preview failed.",
    "errors.preview_failed_status": "Preview failed ({status}).",
    "errors.fix_form": "Please fix the following:",
    "errors.language_required": "Please select a language.",
    "errors.audio_unsupported": "Your browser does not support the audio element.",
    "errors.invalid_payload": "Payload must be a JSON object.",
    "errors.invalid_scenario": "Scenario must be one of the supported values.",
    "errors.invalid_practice_mode": "Practice mode must be one of the supported values.",
    "errors.invalid_body_state": "Body state must be one of the supported values.",
    "errors.invalid_eye_state": "Eye state must be one of the supported values.",
    "errors.invalid_primary_sense": "Primary sense must be one of the supported values.",
    "errors.invalid_duration": "Duration must be one of the supported minute values.",
    "errors.invalid_labeling_mode": "Labeling mode must be one of the supported values.",
    "errors.invalid_silence_profile": "Silence profile must be one of the supported values.",
    "errors.invalid_normalization_frequency":
      "Normalization frequency must be one of the supported values.",
    "errors.invalid_closing_style": "Closing style must be one of the supported values.",
    "errors.invalid_sense_rotation": "Sense rotation must be one of the supported values.",
    "errors.invalid_tts_newline_pause":
      "TTS newline pause seconds must be a non-negative number.",
    "errors.invalid_languages": "Languages must be a non-empty array of strings.",
    "errors.unsupported_language": "One or more languages are not supported.",
    "errors.moving_requires_body_state": "Moving practice mode requires a moving body state.",
    "errors.moving_requires_eyes_open": "Moving practice mode requires eyes open.",
    "errors.tactile_requires_body_state":
      "Tactile practice mode requires still seated with eyes closed.",
    "errors.tactile_requires_eyes_closed": "Tactile practice mode requires eyes closed.",
    "errors.sitting_requires_eyes_open": "Sitting practice mode requires eyes open.",
    "errors.moving_body_requires_moving_practice":
      "Moving body state requires moving practice mode.",
    "errors.label_with_anchor_requires_breath_anchor":
      "Label with anchor mode requires breath anchor labeling.",
    "errors.label_scan_requires_scan_label":
      "Label while scanning mode requires scan and label.",
    "errors.labeling_mode_must_be_none":
      "Labeling mode must be none for non-label practice modes.",
    "errors.extended_silence_requires_longer":
      "Extended silence is only allowed for 5 or 12 minute sessions.",
    "errors.short_sessions_require_once":
      "Short sessions require normalization frequency of once.",
    "errors.five_minute_requires_periodic":
      "5-minute sessions require periodic normalization.",
    "errors.twelve_minute_requires_repeated":
      "12-minute sessions require repeated normalization.",
    "errors.short_sessions_require_minimal_closing":
      "2-minute sessions require minimal closing style.",
    "errors.five_minute_requires_pq_framed":
      "5-minute sessions require PQ-framed closing style.",
    "errors.twelve_minute_requires_progression":
      "12-minute sessions require PQ framing with progression.",
    "errors.invalid_json": "Request body must be valid JSON.",
    "errors.invalid_output_mode": "Output mode must be one of: text, audio, text-audio.",
    "errors.tts_failure": "Failed to synthesize audio.",
    "errors.missing_openai_key": "OpenAI API key is not configured.",
    "errors.invalid_tts_payload": "Request body must include script, language, and voice.",
    "errors.script_too_large": "Script exceeds the maximum length supported for TTS.",
    "errors.method_not_allowed": "Only POST requests are supported.",
    "errors.unauthorized": "Missing or invalid credentials.",
    "errors.payload_too_large": "Request body exceeds the maximum allowed size.",
    "errors.voice_preview_failure": "Unable to generate preview.",
    "errors.generate_failure": "Failed to generate a response.",
    "errors.not_found": "Route not found.",
    "errors.version_unavailable": "Unable to load version.",
    "errors.invalid_custom_scenario_line":
      "Custom scenario line must be a short, single-line sentence with allowed characters.",
    "errors.custom_scenario_line_too_long":
      "Custom scenario line must be {max} characters or fewer.",
    "errors.custom_scenario_line_disallowed":
      "Custom scenario line contains disallowed content.",
  },
  es: {
    "ui.title": "Generador de prácticas de fitness mental",
    "ui.version.loading": "Versión: cargando...",
    "ui.version.unavailable": "Versión: no disponible",
    "ui.version.label": "Versión: {version}",
    "ui.intro":
      "Esta herramienta genera prácticas breves y guiadas de fitness mental al centrarse en sensaciones físicas como el tacto, el sonido, la vista o la respiración.",
    "ui.description":
      "Elige el tipo de práctica guiada de fitness mental que te gustaría crear.",
    "ui.ai_notice":
      "El audio se genera usando inteligencia artificial en función de tus selecciones.",
    "form.scenario_controls": "Controles de escenarios",
    "form.quick_access": "Acceso rápido",
    "form.customize": "Personalizar",
    "form.options": "Opciones",
    "ui.footer":
      "Inspirado en enseñanzas públicas sobre Positive Intelligence® y PQ Reps® de Shirzad Chamine. No afiliado ni avalado por Positive Intelligence LLC. Solo con fines educativos.",
    "form.practice_type": "Tipo de práctica",
    "form.practice_type.still_eyes_closed": "Quieto (ojos cerrados)",
    "form.practice_type.still_eyes_open": "Quieto (ojos abiertos)",
    "form.practice_type.lying_eyes_closed": "Acostado (ojos cerrados)",
    "form.practice_type.moving": "En movimiento",
    "form.practice_type.labeling": "Etiquetado",
    "scenario.calm_me_now": "Cálmame ahora",
    "scenario.get_present_for_meeting": "Ponte presente para una reunión",
    "scenario.start_the_thing_im_avoiding": "Empieza lo que estoy evitando",
    "scenario.prepare_for_a_tough_conversation": "Prepárate para una conversación difícil",
    "scenario.reset_after_feedback": "Reajústate después de comentarios",
    "scenario.wind_down_for_sleep": "Relájate para dormir",
    "scenario.daily_deep_reset": "Reinicio profundo diario",
    "form.focus": "Enfoque",
    "form.focus.touch": "Tacto",
    "form.focus.hearing": "Oído",
    "form.focus.sight": "Vista",
    "form.focus.breath": "Respiración",
    "form.duration": "Duración",
    "form.duration.minutes": "{count} minuto{suffix}",
    "form.language": "Idioma",
    "form.language_label": "Idioma:",
    "form.language.en": "Inglés",
    "form.language.es": "Español",
    "form.language.fr": "Francés",
    "form.language.de": "Alemán",
    "form.voice": "Voz",
    "form.voice.help": "Elige la voz que prefieres para la guía.",
    "form.voice.preview": "Vista previa",
    "form.custom_scenario_line": "Línea de escenario personalizada (opcional)",
    "form.custom_scenario_line.help":
      "Agrega una línea breve y neutral (máximo {max} caracteres). Sin URLs ni temas sensibles.",
    "form.audio_delivery": "Entrega de audio",
    "form.audio_delivery.help":
      "La transmisión inicia la reproducción antes, pero puede ser menos fiable con conexiones inestables y limitar la búsqueda o la reproducción sin conexión.",
    "form.audio_delivery.generate": "Generar",
    "form.audio_delivery.stream": "Transmitir",
    "form.tts_newline_pause": "Pausa de salto de línea de TTS (segundos)",
    "form.debug_tts_prompt": "Depurar prompt de TTS",
    "form.debug_tts_prompt.help":
      "Incluye la carga útil de TTS sin procesar para pruebas en OpenAI playground.",
    "form.submit": "Preparar audio",
    "form.submit.loading": "Preparando audio…",
    "form.reset": "Restablecer valores",
    "status.preparing": "Preparando el audio. Esto puede tardar unos segundos.",
    "status.streaming_audio": "Transmitiendo audio…",
    "status.generating_script": "Generando guion…",
    "status.synthesizing_audio": "Sintetizando audio…",
    "result.title": "Tu sesión está lista",
    "result.download_audio": "Descargar el audio",
    "result.download_text": "Descargar el texto",
    "result.debug_title": "Prompt de TTS (depuración)",
    "result.debug_copy": "Copiar código",
    "result.debug_format": "Formato del prompt de depuración",
    "result.debug_format_json": "JSON",
    "result.debug_format_text": "Texto con formato",
    "result.debug_field.model": "Modelo",
    "result.debug_field.voice": "Voz",
    "result.debug_field.response_format": "Formato de respuesta",
    "result.debug_field.voice_style_preference": "Preferencia de estilo de voz",
    "result.debug_field.script_system_prompt": "Prompt del sistema (guion)",
    "result.debug_field.script_user_prompt": "Prompt del usuario (guion)",
    "result.debug_field.tts_system_prompt": "Prompt del sistema (TTS)",
    "result.debug_field.input": "Entrada",
    "errors.unknown": "Algo salió mal.",
    "errors.generator_failed": "El generador no respondió.",
    "errors.generator_failed_status": "El generador no respondió. ({status})",
    "errors.streaming_unavailable": "Las actualizaciones en streaming no están disponibles.",
    "errors.stream_ended": "La transmisión terminó antes de devolver una respuesta.",
    "errors.streaming_failed": "La transmisión falló.",
    "errors.audio_stream_failed": "Falló la transmisión de audio.",
    "errors.append_audio_chunk_failed": "No se pudo añadir el fragmento de audio.",
    "errors.audio_stream_no_data": "La transmisión de audio terminó antes de que llegaran datos.",
    "errors.preview_failed": "Falló la vista previa.",
    "errors.preview_failed_status": "Falló la vista previa ({status}).",
    "errors.fix_form": "Corrige lo siguiente:",
    "errors.language_required": "Selecciona un idioma.",
    "errors.audio_unsupported": "Tu navegador no admite el elemento de audio.",
    "errors.invalid_payload": "La carga útil debe ser un objeto JSON.",
    "errors.invalid_scenario": "El escenario debe ser uno de los valores admitidos.",
    "errors.invalid_practice_mode": "El modo de práctica debe ser uno de los valores admitidos.",
    "errors.invalid_body_state": "El estado corporal debe ser uno de los valores admitidos.",
    "errors.invalid_eye_state": "El estado de los ojos debe ser uno de los valores admitidos.",
    "errors.invalid_primary_sense": "El sentido principal debe ser uno de los valores admitidos.",
    "errors.invalid_duration": "La duración debe ser uno de los valores de minutos admitidos.",
    "errors.invalid_labeling_mode": "El modo de etiquetado debe ser uno de los valores admitidos.",
    "errors.invalid_silence_profile": "El perfil de silencio debe ser uno de los valores admitidos.",
    "errors.invalid_normalization_frequency":
      "La frecuencia de normalización debe ser uno de los valores admitidos.",
    "errors.invalid_closing_style": "El estilo de cierre debe ser uno de los valores admitidos.",
    "errors.invalid_sense_rotation": "La rotación de sentidos debe ser uno de los valores admitidos.",
    "errors.invalid_tts_newline_pause":
      "Los segundos de pausa de salto de línea de TTS deben ser un número no negativo.",
    "errors.invalid_languages": "Los idiomas deben ser un arreglo no vacío de cadenas.",
    "errors.unsupported_language": "Uno o más idiomas no son compatibles.",
    "errors.moving_requires_body_state":
      "El modo de práctica en movimiento requiere un estado corporal en movimiento.",
    "errors.moving_requires_eyes_open":
      "El modo de práctica en movimiento requiere los ojos abiertos.",
    "errors.tactile_requires_body_state":
      "El modo táctil requiere estar sentado en quietud con los ojos cerrados.",
    "errors.tactile_requires_eyes_closed": "El modo táctil requiere los ojos cerrados.",
    "errors.sitting_requires_eyes_open":
      "El modo sentado requiere los ojos abiertos.",
    "errors.moving_body_requires_moving_practice":
      "El estado corporal en movimiento requiere el modo de práctica en movimiento.",
    "errors.label_with_anchor_requires_breath_anchor":
      "El modo de etiquetar con ancla requiere etiquetado con ancla en la respiración.",
    "errors.label_scan_requires_scan_label":
      "El modo de etiquetar mientras se escanea requiere escanear y etiquetar.",
    "errors.labeling_mode_must_be_none":
      "El modo de etiquetado debe ser ninguno para prácticas sin etiquetado.",
    "errors.extended_silence_requires_longer":
      "El silencio prolongado solo se permite en sesiones de 5 o 12 minutos.",
    "errors.short_sessions_require_once":
      "Las sesiones cortas requieren frecuencia de normalización de una vez.",
    "errors.five_minute_requires_periodic":
      "Las sesiones de 5 minutos requieren normalización periódica.",
    "errors.twelve_minute_requires_repeated":
      "Las sesiones de 12 minutos requieren normalización repetida.",
    "errors.short_sessions_require_minimal_closing":
      "Las sesiones de 2 minutos requieren un estilo de cierre mínimo.",
    "errors.five_minute_requires_pq_framed":
      "Las sesiones de 5 minutos requieren un cierre con marco PQ.",
    "errors.twelve_minute_requires_progression":
      "Las sesiones de 12 minutos requieren un cierre PQ con progresión.",
    "errors.invalid_json": "El cuerpo de la solicitud debe ser JSON válido.",
    "errors.invalid_output_mode":
      "El modo de salida debe ser uno de: text, audio, text-audio.",
    "errors.tts_failure": "No se pudo sintetizar el audio.",
    "errors.missing_openai_key": "La clave de API de OpenAI no está configurada.",
    "errors.invalid_tts_payload":
      "El cuerpo de la solicitud debe incluir script, language y voice.",
    "errors.script_too_large":
      "El guion supera la longitud máxima admitida para TTS.",
    "errors.method_not_allowed": "Solo se admiten solicitudes POST.",
    "errors.unauthorized": "Faltan credenciales o no son válidas.",
    "errors.payload_too_large":
      "El cuerpo de la solicitud supera el tamaño máximo permitido.",
    "errors.voice_preview_failure": "No se pudo generar la vista previa.",
    "errors.generate_failure": "No se pudo generar una respuesta.",
    "errors.not_found": "Ruta no encontrada.",
    "errors.version_unavailable": "No se pudo cargar la versión.",
    "errors.invalid_custom_scenario_line":
      "La línea de escenario personalizada debe ser una frase corta de una sola línea con caracteres permitidos.",
    "errors.custom_scenario_line_too_long":
      "La línea de escenario personalizada debe tener {max} caracteres o menos.",
    "errors.custom_scenario_line_disallowed":
      "La línea de escenario personalizada contiene contenido no permitido.",
  },
  fr: {
    "ui.title": "Générateur de pratiques de forme mentale",
    "ui.version.loading": "Version : chargement...",
    "ui.version.unavailable": "Version : indisponible",
    "ui.version.label": "Version : {version}",
    "ui.intro":
      "Cet outil génère de courtes pratiques guidées de forme mentale en se concentrant sur des sensations physiques telles que le toucher, le son, la vue ou la respiration.",
    "ui.description":
      "Choisissez le type de pratique guidée de forme mentale que vous souhaitez créer.",
    "ui.ai_notice":
      "L’audio est généré à l’aide de l’intelligence artificielle en fonction de vos choix.",
    "form.scenario_controls": "Commandes de scénario",
    "form.quick_access": "Accès rapide",
    "form.customize": "Personnaliser",
    "form.options": "Options",
    "ui.footer":
      "Inspiré d'enseignements publics sur Positive Intelligence® et PQ Reps® de Shirzad Chamine. Non affilié ni approuvé par Positive Intelligence LLC. À des fins éducatives uniquement.",
    "form.practice_type": "Type de pratique",
    "form.practice_type.still_eyes_closed": "Immobile (yeux fermés)",
    "form.practice_type.still_eyes_open": "Immobile (yeux ouverts)",
    "form.practice_type.lying_eyes_closed": "Allongé (yeux fermés)",
    "form.practice_type.moving": "En mouvement",
    "form.practice_type.labeling": "Étiquetage",
    "scenario.calm_me_now": "Calme-moi maintenant",
    "scenario.get_present_for_meeting": "Me rendre présent pour une réunion",
    "scenario.start_the_thing_im_avoiding": "Commencer ce que j’évite",
    "scenario.prepare_for_a_tough_conversation": "Se préparer à une conversation difficile",
    "scenario.reset_after_feedback": "Se recentrer après un retour",
    "scenario.wind_down_for_sleep": "Se détendre pour dormir",
    "scenario.daily_deep_reset": "Réinitialisation profonde quotidienne",
    "form.focus": "Focus",
    "form.focus.touch": "Toucher",
    "form.focus.hearing": "Ouïe",
    "form.focus.sight": "Vue",
    "form.focus.breath": "Respiration",
    "form.duration": "Durée",
    "form.duration.minutes": "{count} minute{suffix}",
    "form.language": "Langue",
    "form.language_label": "Langue :",
    "form.language.en": "Anglais",
    "form.language.es": "Espagnol",
    "form.language.fr": "Français",
    "form.language.de": "Allemand",
    "form.voice": "Voix",
    "form.voice.help": "Choisissez la voix que vous préférez pour la guidance.",
    "form.voice.preview": "Aperçu",
    "form.custom_scenario_line": "Ligne de scénario personnalisée (optionnel)",
    "form.custom_scenario_line.help":
      "Ajoutez une ligne courte et neutre (max {max} caractères). Pas d'URL ni de sujets sensibles.",
    "form.audio_delivery": "Diffusion audio",
    "form.audio_delivery.help":
      "La diffusion démarre plus tôt, mais peut être moins fiable sur des connexions instables et limiter la recherche ou l'écoute hors ligne.",
    "form.audio_delivery.generate": "Générer",
    "form.audio_delivery.stream": "Diffuser",
    "form.tts_newline_pause": "Pause de retour à la ligne TTS (secondes)",
    "form.debug_tts_prompt": "Déboguer le prompt TTS",
    "form.debug_tts_prompt.help":
      "Inclure la charge utile TTS brute pour les tests OpenAI playground.",
    "form.submit": "Préparer l'audio",
    "form.submit.loading": "Préparation de l'audio…",
    "form.reset": "Réinitialiser",
    "status.preparing": "Préparation de l'audio. Cela peut prendre quelques secondes.",
    "status.streaming_audio": "Diffusion audio…",
    "status.generating_script": "Génération du script…",
    "status.synthesizing_audio": "Synthèse audio…",
    "result.title": "Votre session est prête",
    "result.download_audio": "Télécharger l'audio",
    "result.download_text": "Télécharger le texte",
    "result.debug_title": "Prompt TTS (debug)",
    "result.debug_copy": "Copier le code",
    "result.debug_format": "Format du prompt de débogage",
    "result.debug_format_json": "JSON",
    "result.debug_format_text": "Texte formaté",
    "result.debug_field.model": "Modèle",
    "result.debug_field.voice": "Voix",
    "result.debug_field.response_format": "Format de réponse",
    "result.debug_field.voice_style_preference": "Préférence de style vocal",
    "result.debug_field.script_system_prompt": "Invite système (script)",
    "result.debug_field.script_user_prompt": "Invite utilisateur (script)",
    "result.debug_field.tts_system_prompt": "Invite système (TTS)",
    "result.debug_field.input": "Entrée",
    "errors.unknown": "Une erreur est survenue.",
    "errors.generator_failed": "Le générateur n'a pas répondu.",
    "errors.generator_failed_status": "Le générateur n'a pas répondu. ({status})",
    "errors.streaming_unavailable": "Les mises à jour en streaming ne sont pas disponibles.",
    "errors.stream_ended": "Le flux s'est terminé avant d'envoyer une réponse.",
    "errors.streaming_failed": "Le streaming a échoué.",
    "errors.audio_stream_failed": "Le flux audio a échoué.",
    "errors.append_audio_chunk_failed": "Impossible d'ajouter le fragment audio.",
    "errors.audio_stream_no_data": "Le flux audio s'est terminé avant l'arrivée des données.",
    "errors.preview_failed": "L'aperçu a échoué.",
    "errors.preview_failed_status": "L'aperçu a échoué ({status}).",
    "errors.fix_form": "Veuillez corriger les éléments suivants :",
    "errors.language_required": "Veuillez sélectionner une langue.",
    "errors.audio_unsupported": "Votre navigateur ne prend pas en charge l'élément audio.",
    "errors.invalid_payload": "La charge utile doit être un objet JSON.",
    "errors.invalid_scenario": "Le scénario doit être une valeur prise en charge.",
    "errors.invalid_practice_mode": "Le mode de pratique doit être une valeur prise en charge.",
    "errors.invalid_body_state": "L'état du corps doit être une valeur prise en charge.",
    "errors.invalid_eye_state": "L'état des yeux doit être une valeur prise en charge.",
    "errors.invalid_primary_sense": "Le sens principal doit être une valeur prise en charge.",
    "errors.invalid_duration": "La durée doit être une valeur de minutes prise en charge.",
    "errors.invalid_labeling_mode": "Le mode d'étiquetage doit être une valeur prise en charge.",
    "errors.invalid_silence_profile": "Le profil de silence doit être une valeur prise en charge.",
    "errors.invalid_normalization_frequency":
      "La fréquence de normalisation doit être une valeur prise en charge.",
    "errors.invalid_closing_style": "Le style de clôture doit être une valeur prise en charge.",
    "errors.invalid_sense_rotation": "La rotation des sens doit être une valeur prise en charge.",
    "errors.invalid_tts_newline_pause":
      "Les secondes de pause TTS doivent être un nombre non négatif.",
    "errors.invalid_languages": "Les langues doivent être un tableau non vide de chaînes.",
    "errors.unsupported_language": "Une ou plusieurs langues ne sont pas prises en charge.",
    "errors.moving_requires_body_state":
      "Le mode de pratique en mouvement nécessite un état du corps en mouvement.",
    "errors.moving_requires_eyes_open":
      "Le mode de pratique en mouvement nécessite les yeux ouverts.",
    "errors.tactile_requires_body_state":
      "Le mode tactile nécessite d'être assis immobile avec les yeux fermés.",
    "errors.tactile_requires_eyes_closed": "Le mode tactile nécessite les yeux fermés.",
    "errors.sitting_requires_eyes_open":
      "Le mode assis nécessite les yeux ouverts.",
    "errors.moving_body_requires_moving_practice":
      "Un état du corps en mouvement nécessite le mode de pratique en mouvement.",
    "errors.label_with_anchor_requires_breath_anchor":
      "Le mode étiquetage avec ancrage nécessite l'ancrage sur la respiration.",
    "errors.label_scan_requires_scan_label":
      "Le mode étiquetage en balayage nécessite un balayage et un étiquetage.",
    "errors.labeling_mode_must_be_none":
      "Le mode d'étiquetage doit être aucun pour les pratiques sans étiquetage.",
    "errors.extended_silence_requires_longer":
      "Le silence prolongé n'est autorisé que pour les sessions de 5 ou 12 minutes.",
    "errors.short_sessions_require_once":
      "Les sessions courtes nécessitent une normalisation unique.",
    "errors.five_minute_requires_periodic":
      "Les sessions de 5 minutes nécessitent une normalisation périodique.",
    "errors.twelve_minute_requires_repeated":
      "Les sessions de 12 minutes nécessitent une normalisation répétée.",
    "errors.short_sessions_require_minimal_closing":
      "Les sessions de 2 minutes nécessitent un style de clôture minimal.",
    "errors.five_minute_requires_pq_framed":
      "Les sessions de 5 minutes nécessitent une clôture cadrée PQ.",
    "errors.twelve_minute_requires_progression":
      "Les sessions de 12 minutes nécessitent une clôture PQ avec progression.",
    "errors.invalid_json": "Le corps de la requête doit être un JSON valide.",
    "errors.invalid_output_mode":
      "Le mode de sortie doit être l'un de : text, audio, text-audio.",
    "errors.tts_failure": "Échec de la synthèse audio.",
    "errors.missing_openai_key": "La clé API OpenAI n’est pas configurée.",
    "errors.invalid_tts_payload":
      "Le corps de la requête doit inclure script, language et voice.",
    "errors.script_too_large":
      "Le script dépasse la longueur maximale prise en charge pour le TTS.",
    "errors.method_not_allowed": "Seules les requêtes POST sont prises en charge.",
    "errors.unauthorized": "Identifiants manquants ou invalides.",
    "errors.payload_too_large":
      "Le corps de la requête dépasse la taille maximale autorisée.",
    "errors.voice_preview_failure": "Impossible de générer l'aperçu.",
    "errors.generate_failure": "Impossible de générer une réponse.",
    "errors.not_found": "Route introuvable.",
    "errors.version_unavailable": "Impossible de charger la version.",
    "errors.invalid_custom_scenario_line":
      "La ligne de scénario personnalisée doit être une phrase courte sur une seule ligne avec des caractères autorisés.",
    "errors.custom_scenario_line_too_long":
      "La ligne de scénario personnalisée doit contenir {max} caractères ou moins.",
    "errors.custom_scenario_line_disallowed":
      "La ligne de scénario personnalisée contient du contenu interdit.",
  },
  de: {
    "ui.title": "Generator für mentale Fitnessübungen",
    "ui.version.loading": "Version: wird geladen...",
    "ui.version.unavailable": "Version: nicht verfügbar",
    "ui.version.label": "Version: {version}",
    "ui.intro":
      "Dieses Tool erstellt kurze, geführte mentale Fitnessübungen, die sich auf körperliche Empfindungen wie Berührung, Geräusche, Sehen oder Atmung konzentrieren.",
    "ui.description":
      "Wähle die Art der geführten mentalen Fitnessübung, die du erstellen möchtest.",
    "ui.ai_notice":
      "Audio wird auf Grundlage deiner Auswahl mithilfe künstlicher Intelligenz erzeugt.",
    "form.scenario_controls": "Szenario-Steuerung",
    "form.quick_access": "Schnellzugriff",
    "form.customize": "Anpassen",
    "form.options": "Optionen",
    "ui.footer":
      "Inspiriert von öffentlich verfügbaren Lehren zu Positive Intelligence® und PQ Reps® von Shirzad Chamine. Nicht verbunden oder unterstützt von Positive Intelligence LLC. Nur zu Bildungszwecken.",
    "form.practice_type": "Praxisart",
    "form.practice_type.still_eyes_closed": "Still (Augen geschlossen)",
    "form.practice_type.still_eyes_open": "Still (Augen offen)",
    "form.practice_type.lying_eyes_closed": "Liegend (Augen geschlossen)",
    "form.practice_type.moving": "In Bewegung",
    "form.practice_type.labeling": "Benennen",
    "scenario.calm_me_now": "Beruhige mich jetzt",
    "scenario.get_present_for_meeting": "Für ein Meeting präsent werden",
    "scenario.start_the_thing_im_avoiding": "Starte das, was ich vermeide",
    "scenario.prepare_for_a_tough_conversation": "Bereite dich auf ein schwieriges Gespräch vor",
    "scenario.reset_after_feedback": "Nach Feedback neu ausrichten",
    "scenario.wind_down_for_sleep": "Zur Ruhe kommen fürs Einschlafen",
    "scenario.daily_deep_reset": "Täglicher tiefer Reset",
    "form.focus": "Fokus",
    "form.focus.touch": "Berührung",
    "form.focus.hearing": "Hören",
    "form.focus.sight": "Sehen",
    "form.focus.breath": "Atmung",
    "form.duration": "Dauer",
    "form.duration.minutes": "{count} Minute{suffix}",
    "form.language": "Sprache",
    "form.language_label": "Sprache:",
    "form.language.en": "Englisch",
    "form.language.es": "Spanisch",
    "form.language.fr": "Französisch",
    "form.language.de": "Deutsch",
    "form.voice": "Stimme",
    "form.voice.help": "Wähle die Stimme, die du für die Anleitung bevorzugst.",
    "form.voice.preview": "Vorschau",
    "form.custom_scenario_line": "Benutzerdefinierte Szenariozeile (optional)",
    "form.custom_scenario_line.help":
      "Füge eine kurze, neutrale Zeile hinzu (max {max} Zeichen). Keine URLs oder sensible Themen.",
    "form.audio_delivery": "Audioübertragung",
    "form.audio_delivery.help":
      "Streaming startet die Wiedergabe früher, kann aber bei instabilen Verbindungen unzuverlässiger sein und das Suchen oder Offline-Hören einschränken.",
    "form.audio_delivery.generate": "Erzeugen",
    "form.audio_delivery.stream": "Streamen",
    "form.tts_newline_pause": "TTS-Zeilenumbruchpause (Sekunden)",
    "form.debug_tts_prompt": "TTS-Prompt debuggen",
    "form.debug_tts_prompt.help":
      "Fügt die rohe TTS-Nutzlast für Tests im OpenAI Playground hinzu.",
    "form.submit": "Audio vorbereiten",
    "form.submit.loading": "Audio wird vorbereitet…",
    "form.reset": "Auf Standard zurücksetzen",
    "status.preparing": "Audio wird vorbereitet. Das kann ein paar Sekunden dauern.",
    "status.streaming_audio": "Audio wird gestreamt…",
    "status.generating_script": "Skript wird erstellt…",
    "status.synthesizing_audio": "Audio wird synthetisiert…",
    "result.title": "Deine Sitzung ist bereit",
    "result.download_audio": "Audio herunterladen",
    "result.download_text": "Text herunterladen",
    "result.debug_title": "TTS-Prompt (Debug)",
    "result.debug_copy": "Code kopieren",
    "result.debug_format": "Format des Debug-Prompts",
    "result.debug_format_json": "JSON",
    "result.debug_format_text": "Formatierter Text",
    "result.debug_field.model": "Modell",
    "result.debug_field.voice": "Stimme",
    "result.debug_field.response_format": "Antwortformat",
    "result.debug_field.voice_style_preference": "Stimmstilpräferenz",
    "result.debug_field.script_system_prompt": "System-Prompt (Skript)",
    "result.debug_field.script_user_prompt": "Benutzer-Prompt (Skript)",
    "result.debug_field.tts_system_prompt": "System-Prompt (TTS)",
    "result.debug_field.input": "Eingabe",
    "errors.unknown": "Es ist ein Fehler aufgetreten.",
    "errors.generator_failed": "Der Generator hat nicht geantwortet.",
    "errors.generator_failed_status": "Der Generator hat nicht geantwortet. ({status})",
    "errors.streaming_unavailable": "Streaming-Updates sind nicht verfügbar.",
    "errors.stream_ended": "Der Stream endete, bevor eine Antwort zurückkam.",
    "errors.streaming_failed": "Streaming fehlgeschlagen.",
    "errors.audio_stream_failed": "Audio-Stream fehlgeschlagen.",
    "errors.append_audio_chunk_failed": "Audio-Chunk konnte nicht hinzugefügt werden.",
    "errors.audio_stream_no_data": "Der Audio-Stream endete, bevor Daten ankamen.",
    "errors.preview_failed": "Vorschau fehlgeschlagen.",
    "errors.preview_failed_status": "Vorschau fehlgeschlagen ({status}).",
    "errors.fix_form": "Bitte behebe die folgenden Punkte:",
    "errors.language_required": "Bitte wähle eine Sprache aus.",
    "errors.audio_unsupported": "Dein Browser unterstützt das Audioelement nicht.",
    "errors.invalid_payload": "Die Nutzlast muss ein JSON-Objekt sein.",
    "errors.invalid_scenario": "Das Szenario muss einer der unterstützten Werte sein.",
    "errors.invalid_practice_mode": "Der Praxismodus muss einer der unterstützten Werte sein.",
    "errors.invalid_body_state": "Der Körperzustand muss einer der unterstützten Werte sein.",
    "errors.invalid_eye_state": "Der Augenzustand muss einer der unterstützten Werte sein.",
    "errors.invalid_primary_sense": "Der primäre Sinn muss einer der unterstützten Werte sein.",
    "errors.invalid_duration": "Die Dauer muss einer der unterstützten Minutenwerte sein.",
    "errors.invalid_labeling_mode": "Der Benennungsmodus muss einer der unterstützten Werte sein.",
    "errors.invalid_silence_profile": "Das Stilleprofil muss einer der unterstützten Werte sein.",
    "errors.invalid_normalization_frequency":
      "Die Normalisierungshäufigkeit muss einer der unterstützten Werte sein.",
    "errors.invalid_closing_style": "Der Abschlussstil muss einer der unterstützten Werte sein.",
    "errors.invalid_sense_rotation": "Die Sinnesrotation muss einer der unterstützten Werte sein.",
    "errors.invalid_tts_newline_pause":
      "Die TTS-Zeilenumbruchpause muss eine nichtnegative Zahl sein.",
    "errors.invalid_languages": "Sprachen müssen ein nicht leeres Array von Strings sein.",
    "errors.unsupported_language": "Eine oder mehrere Sprachen werden nicht unterstützt.",
    "errors.moving_requires_body_state":
      "Der Übungsmodus in Bewegung erfordert einen Körperzustand in Bewegung.",
    "errors.moving_requires_eyes_open":
      "Der Übungsmodus in Bewegung erfordert offene Augen.",
    "errors.tactile_requires_body_state":
      "Der taktile Modus erfordert stilles Sitzen mit geschlossenen Augen.",
    "errors.tactile_requires_eyes_closed": "Der taktile Modus erfordert geschlossene Augen.",
    "errors.sitting_requires_eyes_open": "Der Sitzmodus erfordert offene Augen.",
    "errors.moving_body_requires_moving_practice":
      "Ein bewegter Körperzustand erfordert den Übungsmodus in Bewegung.",
    "errors.label_with_anchor_requires_breath_anchor":
      "Der Modus „Benennen mit Anker“ erfordert das Benennen mit Atemanker.",
    "errors.label_scan_requires_scan_label":
      "Der Modus „Benennen beim Scannen“ erfordert Scannen und Benennen.",
    "errors.labeling_mode_must_be_none":
      "Der Benennungsmodus muss „kein“ sein für Nicht-Benennungsübungen.",
    "errors.extended_silence_requires_longer":
      "Längere Stille ist nur bei 5- oder 12-Minuten-Sitzungen erlaubt.",
    "errors.short_sessions_require_once":
      "Kurze Sitzungen erfordern eine Normalisierung „einmal“.",
    "errors.five_minute_requires_periodic":
      "5-Minuten-Sitzungen erfordern periodische Normalisierung.",
    "errors.twelve_minute_requires_repeated":
      "12-Minuten-Sitzungen erfordern wiederholte Normalisierung.",
    "errors.short_sessions_require_minimal_closing":
      "2-Minuten-Sitzungen erfordern einen minimalen Abschlussstil.",
    "errors.five_minute_requires_pq_framed":
      "5-Minuten-Sitzungen erfordern einen PQ-gerahmten Abschlussstil.",
    "errors.twelve_minute_requires_progression":
      "12-Minuten-Sitzungen erfordern einen PQ-Abschluss mit Progression.",
    "errors.invalid_json": "Der Anfragetext muss gültiges JSON sein.",
    "errors.invalid_output_mode":
      "Der Ausgabemodus muss einer der folgenden sein: text, audio, text-audio.",
    "errors.tts_failure": "Audio konnte nicht synthetisiert werden.",
    "errors.missing_openai_key": "Der OpenAI-API-Schlüssel ist nicht konfiguriert.",
    "errors.invalid_tts_payload":
      "Der Anfragetext muss script, language und voice enthalten.",
    "errors.script_too_large": "Das Skript überschreitet die maximale TTS-Länge.",
    "errors.method_not_allowed": "Nur POST-Anfragen werden unterstützt.",
    "errors.unauthorized": "Fehlende oder ungültige Anmeldedaten.",
    "errors.payload_too_large":
      "Der Anfragetext überschreitet die maximal zulässige Größe.",
    "errors.voice_preview_failure": "Vorschau konnte nicht erstellt werden.",
    "errors.generate_failure": "Antwort konnte nicht erzeugt werden.",
    "errors.not_found": "Route nicht gefunden.",
    "errors.version_unavailable": "Version konnte nicht geladen werden.",
    "errors.invalid_custom_scenario_line":
      "Die benutzerdefinierte Szenariozeile muss ein kurzer, einzeiliger Satz mit erlaubten Zeichen sein.",
    "errors.custom_scenario_line_too_long":
      "Die benutzerdefinierte Szenariozeile darf höchstens {max} Zeichen lang sein.",
    "errors.custom_scenario_line_disallowed":
      "Die benutzerdefinierte Szenariozeile enthält unzulässige Inhalte.",
  },
};

export const resolveLocale = (value?: string | null): Locale => {
  if (!value) {
    return DEFAULT_LOCALE;
  }
  const normalized = value.toLowerCase();
  const base = normalized.split("-")[0];
  return SUPPORTED_LOCALES.includes(base as Locale)
    ? (base as Locale)
    : DEFAULT_LOCALE;
};

export const resolveLocaleFromPayload = (payload: unknown): Locale => {
  if (!payload || typeof payload !== "object") {
    return DEFAULT_LOCALE;
  }
  const record = payload as {
    locale?: string;
    language?: string;
    languages?: string[];
  };
  if (record.locale) {
    return resolveLocale(record.locale);
  }
  if (record.language) {
    return resolveLocale(record.language);
  }
  if (Array.isArray(record.languages) && record.languages.length > 0) {
    return resolveLocale(record.languages[0]);
  }
  return DEFAULT_LOCALE;
};

export const translate = (
  locale: Locale,
  key: string,
  params?: MessageParams,
): string => {
  const template = MESSAGES[locale]?.[key] ?? MESSAGES[DEFAULT_LOCALE]?.[key] ?? key;
  if (!params) {
    return template;
  }
  return Object.entries(params).reduce(
    (result, [paramKey, value]) =>
      result.replaceAll(`{${paramKey}}`, String(value)),
    template,
  );
};

export const formatMinutes = (locale: Locale, count: number): string => {
  switch (locale) {
    case "es":
      return `${count} minuto${count === 1 ? "" : "s"}`;
    case "fr":
      return `${count} minute${count === 1 ? "" : "s"}`;
    case "de":
      return `${count} Minute${count === 1 ? "" : "n"}`;
    default:
      return `${count} minute${count === 1 ? "" : "s"}`;
  }
};
