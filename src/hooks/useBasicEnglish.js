// Hook para preprocesar el input del usuario y mantenerlo simple
import { useCallback } from 'react'

// Mapa de palabras complejas → equivalentes simples (A1-A2)
const WORD_REPLACEMENTS = {
  'utilize': 'use',
  'commence': 'start',
  'terminate': 'end',
  'purchase': 'buy',
  'require': 'need',
  'obtain': 'get',
  'demonstrate': 'show',
  'endeavor': 'try',
  'facilitate': 'help',
  'subsequently': 'then',
  'nevertheless': 'but',
  'furthermore': 'also',
  'approximately': 'about',
  'sufficient': 'enough',
  'comprehend': 'understand',
  'communicate': 'talk',
  'assistance': 'help',
  'difficult': 'hard',
  'excellent': 'great',
  'wonderful': 'nice',
}

export function useBasicEnglish() {
  // Simplifica el texto reemplazando palabras complejas
  const simplifyText = useCallback((text) => {
    let simplified = text
    Object.entries(WORD_REPLACEMENTS).forEach(([complex, simple]) => {
      const regex = new RegExp(`\\b${complex}\\b`, 'gi')
      simplified = simplified.replace(regex, simple)
    })
    return simplified
  }, [])

  // Valida que el mensaje no esté vacío
  const validateInput = useCallback((text) => {
    const trimmed = text.trim()
    if (!trimmed) return { valid: false, error: 'Please write something!' }
    if (trimmed.length > 500) return { valid: false, error: 'Message too long. Keep it short!' }
    return { valid: true, error: null }
  }, [])

  return { simplifyText, validateInput }
}
