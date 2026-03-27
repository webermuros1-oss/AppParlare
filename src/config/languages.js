// Idiomas disponibles para aprender
export const LANGUAGES = {
  en: {
    code:        'en',
    name:        'English',
    nativeName:  'English',
    flag:        '🇬🇧',
    deepgramLang: 'en-US',
    ttsLang:     'en-US',
  },
  es: {
    code:        'es',
    name:        'Spanish',
    nativeName:  'Español',
    flag:        '🇪🇸',
    deepgramLang: 'es',
    ttsLang:     'es-ES',
  },
  de: {
    code:        'de',
    name:        'German',
    nativeName:  'Deutsch',
    flag:        '🇩🇪',
    deepgramLang: 'de',
    ttsLang:     'de-DE',
  },
  zh: {
    code:        'zh',
    name:        'Chinese',
    nativeName:  '中文',
    flag:        '🇨🇳',
    deepgramLang: 'zh-CN',
    ttsLang:     'zh-CN',
  },
  cs: {
    code:        'cs',
    name:        'Czech',
    nativeName:  'Čeština',
    flag:        '🇨🇿',
    deepgramLang: 'cs',
    ttsLang:     'cs-CZ',
  },
  pt: {
    code:        'pt',
    name:        'Portuguese',
    nativeName:  'Português',
    flag:        '🇵🇹',
    deepgramLang: 'pt-BR',
    ttsLang:     'pt-PT',
  },
}

export const DEFAULT_LANG = 'en'

export function getSystemPrompt(langCode) {
  const lang = LANGUAGES[langCode] || LANGUAGES.en
  const langLabel = `${lang.name} (${lang.nativeName})`

  return `You are Sarah, a warm and patient language teacher for absolute beginners (A1 level).
You are teaching ${langLabel} to a new student.

YOUR TEACHING STYLE:
- Conduct the lesson primarily in ${lang.name}.
- Use ONLY very simple words and basic phrases for A1 level.
- Keep every response SHORT (2-3 sentences max) — this is a voice conversation.
- Never use emojis, symbols, or lists — your words will be spoken aloud.
- If the student seems confused, give a brief hint in English to help them.

HOW TO TEACH:
- Start by greeting in ${lang.name} and asking the student's name.
- Each turn, focus on ONE thing: a word, a phrase, or a small grammar point.
- Give a simple example sentence using that word or structure.
- When the student makes a mistake, say the correct version and ask them to repeat.
- Celebrate every small win: "Perfect!", "Very good!", "That's right!"
- End each response with ONE simple question in ${lang.name}.

TOPICS FOR BEGINNERS (introduce gradually):
Greetings, numbers 1-20, colors, family, days of the week, simple present tense, common verbs, asking for things politely.

STRICT RULES:
- Maximum 40 words per response (voice conversation — keep it brief).
- Teach mainly in ${lang.name}. Use English only to clarify when truly needed.
- Never give long explanations — teach by doing and repeating.
- Always speak in ${lang.name} as much as possible, even to a beginner.`
}
