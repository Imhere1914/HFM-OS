// Unified TTS: tries server (OpenAI key required) then falls back to Web Speech API
// with per-model voice characteristics so each avatar sounds distinct.

// ── iOS audio unlock ──────────────────────────────────────────────────────────
// iOS requires audio play() to be triggered within a user gesture. By the time TTS
// is ready (after transcribe + chat API calls), the gesture context has expired.
// Unlocking during the initial tap creates a persistent AudioContext that lets
// subsequent audio.play() calls succeed regardless of async depth.
let _audioCtxUnlocked = false
let _speechUnlocked = false

export function unlockAudioForIOS(): void {
  if (typeof window === 'undefined') return

  // Unlock HTMLAudioElement via a silent AudioContext buffer
  if (!_audioCtxUnlocked) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext
      const ctx = new AC()
      const buf = ctx.createBuffer(1, 1, 22050)
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.connect(ctx.destination)
      src.start(0)
      _audioCtxUnlocked = true
    } catch { /* ignore */ }
  }

  // Unlock Web Speech API with a silent utterance
  if (!_speechUnlocked && 'speechSynthesis' in window) {
    try {
      const u = new SpeechSynthesisUtterance('')
      u.volume = 0
      window.speechSynthesis.speak(u)
      _speechUnlocked = true
    } catch { /* ignore */ }
  }
}

export interface SpeakOptions {
  modelId?: string
  onEnd?: () => void
  onError?: () => void
  signal?: AbortSignal
}

interface WebConfig {
  rate: number
  pitch: number
  genderHint: 'male' | 'female' | 'neutral'
}

const MODEL_CONFIG: Record<string, WebConfig> = {
  nova:   { rate: 1.0,  pitch: 1.18, genderHint: 'female'  },
  marcus: { rate: 0.88, pitch: 0.72, genderHint: 'male'    },
  aria:   { rate: 1.05, pitch: 1.0,  genderHint: 'neutral' },
  kai:    { rate: 1.2,  pitch: 1.05, genderHint: 'neutral' },
  sage:   { rate: 0.85, pitch: 0.92, genderHint: 'female'  },
  fable:  { rate: 0.98, pitch: 1.1,  genderHint: 'neutral' },
}

const DEFAULT_CONFIG: WebConfig = { rate: 1.0, pitch: 1.0, genderHint: 'neutral' }

// Preload voices — browsers fire voiceschanged async
let _voices: SpeechSynthesisVoice[] = []
function _refreshVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const v = window.speechSynthesis.getVoices()
  if (v.length) _voices = v
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  _refreshVoices()
  window.speechSynthesis.addEventListener('voiceschanged', _refreshVoices)
}

function pickVoice(hint: 'male' | 'female' | 'neutral'): SpeechSynthesisVoice | null {
  const en = _voices.filter(v => v.lang.startsWith('en'))
  if (!en.length) return _voices[0] ?? null

  const female = /samantha|karen|moira|tessa|victoria|fiona|kate|serena|ava|zoe|alice|linda/i
  const male   = /daniel|alex|tom|fred|lee|bruce|gordon|ralph|arthur|james|mark|ryan/i

  if (hint === 'female') {
    return en.find(v => female.test(v.name) && /premium|enhanced/i.test(v.name))
        ?? en.find(v => female.test(v.name))
        ?? en.find(v => /premium|enhanced/i.test(v.name))
        ?? en[0]
  }
  if (hint === 'male') {
    return en.find(v => male.test(v.name) && /premium|enhanced/i.test(v.name))
        ?? en.find(v => male.test(v.name))
        ?? en.find(v => /premium|enhanced/i.test(v.name))
        ?? en[0]
  }
  return en.find(v => !v.localService && /premium|enhanced/i.test(v.name))
      ?? en.find(v => !v.localService)
      ?? en.find(v => /premium|enhanced/i.test(v.name))
      ?? en[0]
}

export function cleanForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/[*_~]{1,3}/g, '')
    .replace(/\/api\/media\/file\/[\w.-]+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Returns the model ID stored in localStorage (set by voice screen selector)
export function getStoredVoiceModelId(): string {
  try { return localStorage.getItem('hermes-voice-model') ?? 'marcus' } catch { return 'marcus' }
}

/**
 * Speak text using the selected voice model.
 * Tries server TTS (requires OPENAI_API_KEY); falls back to Web Speech API
 * with model-specific rate/pitch/gender so each avatar sounds distinct.
 */
export async function speakText(text: string, opts: SpeakOptions = {}): Promise<void> {
  const { modelId, onEnd, onError, signal } = opts
  const cleaned = cleanForSpeech(text).slice(0, 2000)
  if (!cleaned) { onEnd?.(); return }

  // Try server TTS
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleaned, voice_model_id: modelId }),
      signal,
    })
    if (res.ok) {
      const blob = await res.blob()
      // Check it's actually audio (not an error JSON blob)
      if (blob.type.startsWith('audio/')) {
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => { URL.revokeObjectURL(url); resolve() }
          audio.onerror = () => { URL.revokeObjectURL(url); reject(new Error('audio error')) }
          signal?.addEventListener('abort', () => { audio.pause(); reject(new DOMException('aborted', 'AbortError')) })
          audio.play().catch(reject)
        })
        onEnd?.()
        return
      }
    }
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') { onEnd?.(); return }
    // fall through to Web Speech
  }

  // Web Speech API fallback with model-specific characteristics
  if (typeof window === 'undefined' || !window.speechSynthesis) { onEnd?.(); return }

  _refreshVoices() // one more attempt in case voices loaded since page load
  const cfg = MODEL_CONFIG[modelId ?? ''] ?? DEFAULT_CONFIG
  const u = new SpeechSynthesisUtterance(cleaned)
  const v = pickVoice(cfg.genderHint)
  if (v) u.voice = v
  u.rate = cfg.rate
  u.pitch = cfg.pitch
  u.lang = 'en-US'
  u.onend = () => onEnd?.()
  u.onerror = () => { onEnd?.(); onError?.() }
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}

export function stopSpeech(audioEl?: HTMLAudioElement | null) {
  if (audioEl) { audioEl.pause(); audioEl.src = '' }
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
}
