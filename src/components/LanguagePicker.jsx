import { LANGUAGES } from '../config/languages'

export default function LanguagePicker({ selected, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-hide"
         style={{ borderBottom: '1px solid rgba(123,47,255,0.15)' }}>
      {Object.values(LANGUAGES).map(lang => (
        <button
          key={lang.code}
          onClick={() => onChange(lang.code)}
          className="flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
          style={selected === lang.code
            ? { background: 'linear-gradient(135deg,#FF6B00,#7B2FFF)', color: 'white', boxShadow: '0 2px 12px rgba(255,107,0,0.35)' }
            : { background: 'rgba(123,47,255,0.1)', border: '1px solid rgba(123,47,255,0.25)', color: 'rgba(180,160,220,0.8)' }
          }
        >
          <span className="text-lg leading-none">{lang.flag}</span>
          <span>{lang.nativeName}</span>
        </button>
      ))}
    </div>
  )
}
