import { useEffect, useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { SentIcon, Mic01Icon, AiMagicIcon } from '@hugeicons/core-free-icons'
import { sendChat, type ChatMessage } from '@/lib/chat-api'
import { useBrand } from '@/contexts/BrandContext'
import { toast } from '@/components/toast'

const SUGGESTIONS = [
  'Summarize my new leads',
  'Draft a welcome campaign',
  'What appointments are coming up?',
  'Write a social post about our services',
]

export function ChatScreen() {
  const brand = useBrand()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceOut, setVoiceOut] = useState(false)
  const recogRef = useRef<unknown>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  function speak(text: string) {
    if (!voiceOut || typeof window === 'undefined' || !window.speechSynthesis) return
    const u = new SpeechSynthesisUtterance(text)
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }

  async function submit(text: string) {
    const content = text.trim()
    if (!content || busy) return
    const next: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(next)
    setInput('')
    setBusy(true)
    try {
      const { reply } = await sendChat(next)
      setMessages([...next, { role: 'assistant', content: reply }])
      speak(reply)
    } catch (e) {
      toast((e as Error).message, { type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  function toggleVoice() {
    const W = window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown }
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition
    if (!Ctor) {
      toast('Voice input not supported in this browser', { type: 'error' })
      return
    }
    if (listening) {
      ;(recogRef.current as { stop?: () => void })?.stop?.()
      setListening(false)
      return
    }
    const recog = new Ctor() as {
      lang: string; interimResults: boolean; continuous: boolean
      onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void
      onend: () => void; onerror: () => void; start: () => void
    }
    recog.lang = 'en-US'
    recog.interimResults = false
    recog.continuous = false
    recog.onresult = (e) => {
      const t = e.results[0]?.[0]?.transcript ?? ''
      if (t) submit(t)
    }
    recog.onend = () => setListening(false)
    recog.onerror = () => setListening(false)
    recogRef.current = recog
    setListening(true)
    recog.start()
  }

  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--theme-bg-grad)', backgroundAttachment: 'fixed' }}>
      {/* Header */}
      <header
        className="flex items-center justify-between border-b px-6 py-3.5"
        style={{ background: 'var(--theme-sidebar-bg)', borderColor: 'var(--theme-sidebar-border)', backdropFilter: 'blur(16px)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{
              background: `linear-gradient(135deg, ${brand.accentColor}, color-mix(in srgb, ${brand.accentColor} 65%, #7b3fe4))`,
              boxShadow: `0 2px 8px color-mix(in srgb, ${brand.accentColor} 38%, transparent)`,
            }}
          >
            <HugeiconsIcon icon={AiMagicIcon} size={14} className="text-white" />
          </div>
          <div>
            <h1 className="text-[13px] font-semibold text-[var(--theme-text)]">{brand.shortName} Assistant</h1>
            <p className="text-[11px] text-[var(--theme-muted)]">Powered by Hermes</p>
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--theme-muted)]">
          <input
            type="checkbox"
            checked={voiceOut}
            onChange={(e) => setVoiceOut(e.target.checked)}
            className="accent-[var(--theme-accent)]"
          />
          Speak replies
        </label>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-5 py-14 text-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{
                  background: `linear-gradient(135deg, ${brand.accentColor}, color-mix(in srgb, ${brand.accentColor} 60%, #7b3fe4))`,
                  boxShadow: `0 4px 24px color-mix(in srgb, ${brand.accentColor} 35%, transparent)`,
                }}
              >
                <HugeiconsIcon icon={AiMagicIcon} size={26} className="text-white" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-[var(--theme-text)]">Hi, I'm your {brand.name} assistant</h2>
                <p className="mt-1 text-[13px] text-[var(--theme-muted)]">Ask me to manage anything across your business</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-card)] px-3.5 py-1.5 text-[12px] text-[var(--theme-muted)] backdrop-blur-sm transition-all hover:border-[var(--theme-accent)] hover:text-[var(--theme-accent)]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div
                  className="mr-2.5 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: `linear-gradient(135deg, ${brand.accentColor}, color-mix(in srgb, ${brand.accentColor} 65%, #7b3fe4))`,
                  }}
                >
                  <HugeiconsIcon icon={AiMagicIcon} size={12} className="text-white" />
                </div>
              )}
              <div
                className="max-w-[78%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed"
                style={
                  m.role === 'user'
                    ? {
                        background: `linear-gradient(135deg, ${brand.accentColor}, color-mix(in srgb, ${brand.accentColor} 72%, #7b3fe4))`,
                        color: 'white',
                        boxShadow: `0 2px 14px color-mix(in srgb, ${brand.accentColor} 30%, transparent)`,
                        borderBottomRightRadius: '6px',
                      }
                    : {
                        background: 'var(--theme-card)',
                        border: '1px solid var(--theme-border)',
                        color: 'var(--theme-text)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                        backdropFilter: 'blur(10px)',
                        borderBottomLeftRadius: '6px',
                      }
                }
              >
                {m.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {busy && (
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                style={{ background: `linear-gradient(135deg, ${brand.accentColor}, color-mix(in srgb, ${brand.accentColor} 65%, #7b3fe4))` }}
              >
                <HugeiconsIcon icon={AiMagicIcon} size={12} className="text-white" />
              </div>
              <div
                className="flex gap-1 rounded-2xl border border-[var(--theme-border)] px-4 py-3"
                style={{ background: 'var(--theme-card)', backdropFilter: 'blur(10px)' }}
              >
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="h-1.5 w-1.5 rounded-full animate-bounce"
                    style={{
                      background: 'var(--theme-accent)',
                      animationDelay: `${d * 0.15}s`,
                      opacity: 0.6,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input bar */}
      <div
        className="border-t px-6 py-4"
        style={{ background: 'var(--theme-sidebar-bg)', borderColor: 'var(--theme-sidebar-border)', backdropFilter: 'blur(16px)' }}
      >
        <div className="mx-auto flex w-full max-w-[720px] items-end gap-2.5">
          <button
            onClick={toggleVoice}
            className="shrink-0 rounded-xl border p-2.5 transition-all"
            style={
              listening
                ? {
                    background: `linear-gradient(135deg, ${brand.accentColor}, color-mix(in srgb, ${brand.accentColor} 65%, #7b3fe4))`,
                    borderColor: 'transparent',
                    color: 'white',
                    boxShadow: `0 2px 12px color-mix(in srgb, ${brand.accentColor} 40%, transparent)`,
                  }
                : { borderColor: 'var(--theme-border)', color: 'var(--theme-muted)', background: 'var(--theme-card)' }
            }
            title="Voice input"
          >
            <HugeiconsIcon icon={Mic01Icon} size={17} />
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit(input)
              }
            }}
            placeholder={listening ? 'Listening…' : 'Message your assistant… (⏎ to send)'}
            rows={1}
            className="max-h-36 flex-1 resize-none rounded-xl border px-4 py-2.5 text-[13px] leading-relaxed outline-none transition-all"
            style={{
              background: 'var(--theme-input)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--theme-accent)'
              e.currentTarget.style.boxShadow = 'var(--theme-glow)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--theme-border)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />

          <button
            onClick={() => submit(input)}
            disabled={!input.trim() || busy}
            className="btn-primary shrink-0 rounded-xl p-2.5"
          >
            <HugeiconsIcon icon={SentIcon} size={17} />
          </button>
        </div>
      </div>
    </div>
  )
}
