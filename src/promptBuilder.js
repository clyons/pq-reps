const fs = require('fs');
const path = require('path');

const TEMPLATE_DIR = path.join(__dirname, 'content', 'templates');
const DEFAULT_LANGUAGE = 'en';

function loadTemplate(language) {
  const safeLanguage = (language || DEFAULT_LANGUAGE).toLowerCase();
  const templatePath = path.join(TEMPLATE_DIR, `${safeLanguage}.json`);

  if (fs.existsSync(templatePath)) {
    return JSON.parse(fs.readFileSync(templatePath, 'utf8'));
  }

  const fallbackPath = path.join(TEMPLATE_DIR, `${DEFAULT_LANGUAGE}.json`);
  return JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
}

function applyPlaceholders(text, { timings, senses }) {
  return text
    .replaceAll('{{timings}}', timings)
    .replaceAll('{{senses}}', senses);
}

function buildPrompt({ language, timings, senses }) {
  const template = loadTemplate(language);
  return applyPlaceholders(template.prompt, { timings, senses });
}

module.exports = {
  buildPrompt,
  loadTemplate,
};
