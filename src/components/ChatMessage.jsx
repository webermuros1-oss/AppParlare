// Componente: burbuja de mensaje individual
export default function ChatMessage({ message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex message-appear ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {/* Avatar del asistente */}
      {!isUser && (
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm mr-2 mt-1"
          style={{ background: 'linear-gradient(135deg, #7B2FFF, #FF2D9B)' }}
        >
          🎓
        </div>
      )}

      {/* Burbuja del mensaje */}
      <div
        className="max-w-[75%] px-4 py-2 rounded-2xl text-sm leading-relaxed"
        style={isUser
          ? {
              background: 'linear-gradient(135deg, #FF6B00, #7B2FFF)',
              color: 'white',
              borderBottomRightRadius: '4px',
            }
          : {
              background: 'rgba(28, 28, 48, 0.9)',
              border: '1px solid rgba(123, 47, 255, 0.25)',
              color: '#e0e0f0',
              borderBottomLeftRadius: '4px',
            }
        }
      >
        {message.content}
      </div>

      {/* Avatar del usuario */}
      {isUser && (
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ml-2 mt-1"
          style={{ background: 'rgba(255, 107, 0, 0.2)', border: '1px solid rgba(255, 107, 0, 0.4)' }}
        >
          👤
        </div>
      )}
    </div>
  )
}
