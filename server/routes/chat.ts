/**
 * /api/chat — AI assistant with OpenRouter + Knowledge Vault context.
 *
 * Priority:
 *  1. OpenRouter (OPENROUTER_API_KEY set) — live LLM call with knowledge context
 *  2. Hermes session-send bridge (HERMES_API_URL set, no OpenRouter key) — fire & poll
 *  3. Keyword fallback — offline canned responses
 *
 * SC default model: minimax/minimax-m3 (cheap, fast)
 * HFM default model: minimax/minimax-m3 (same)
 * Override via MODEL env var.
 */
import type { Hono } from 'hono'
import { buildAssistantContext } from '../stores/knowledge-store'

interface ChatMessage { role: 'user' | 'assistant'; content: string }

// ── Brand helpers ─────────────────────────────────────────────────────────────

function brandId(): string { return (process.env.BRAND ?? 'default').toLowerCase() }

function brandName(): string {
  const b = brandId()
  if (b === 'hfm') return 'Holistic Functional Care'
  if (b === 'sc') return 'Simple Connect'
  return 'AI OS'
}

function defaultModel(): string {
  return process.env.MODEL ?? 'minimax/minimax-m3'
}

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  const b = brandId()
  const name = brandName()
  const knowledgeCtx = buildAssistantContext(b)

  const hfmGuard = b === 'hfm'
    ? '\n\nIMPORTANT: You are a business operations assistant. NEVER diagnose conditions, prescribe treatments, or give medical advice. Always direct clinical questions to the practitioner.'
    : ''

  const base = `You are the ${name} AI assistant — a smart business operations co-pilot. You help users manage their pipeline, contacts, conversations, appointments, campaigns, social posts, projects, pages, templates, media, and automations through this AI Operating System.

Be concise, practical, and action-oriented. When asked about data, summarise what you know. When asked to do something, describe the steps clearly. You have awareness of the platform's modules: Dashboard, Assistant, Highlights, Knowledge Vault, Conversations, Contacts, Appointments, Social, Campaigns, Pages, Templates, Media Studio, Projects, Automations, Avatars, Plugins.${hfmGuard}`

  if (!knowledgeCtx) return base

  return `${base}

## Business Knowledge
${knowledgeCtx}`
}

// ── OpenRouter direct call ────────────────────────────────────────────────────

async function callOpenRouter(messages: ChatMessage[]): Promise<{ reply: string; live: boolean; model: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('no key')

  const model = defaultModel()
  const systemPrompt = buildSystemPrompt()

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://ai-os.app',
      'X-Title': brandName(),
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: 1024,
      temperature: 0.7,
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`OpenRouter ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
    model?: string
  }
  const reply = data.choices?.[0]?.message?.content ?? ''
  if (!reply) throw new Error('empty response')
  return { reply, live: true, model: data.model ?? model }
}

// ── Hermes session-send bridge ────────────────────────────────────────────────
// Fires the message to Hermes and polls /api/session-history for the reply.
// Uses sessionKey 'ai-os' to keep a dedicated conversation thread.

const HERMES_SESSION_KEY = 'ai-os'
const HERMES_POLL_INTERVAL_MS = 1000
const HERMES_POLL_MAX_ATTEMPTS = 30 // 30 s

async function callHermesBridge(messages: ChatMessage[]): Promise<{ reply: string; live: boolean; model: string }> {
  const base = process.env.HERMES_API_URL?.replace(/\/$/, '')
  if (!base) throw new Error('no hermes url')
  const token = process.env.HERMES_API_TOKEN ?? ''
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content ?? ''

  // Send the message
  const sendRes = await fetch(`${base}/api/session-send`, {
    method: 'POST', headers,
    body: JSON.stringify({ sessionKey: HERMES_SESSION_KEY, message: lastUserMsg }),
  })
  if (!sendRes.ok) throw new Error(`Hermes send ${sendRes.status}`)

  // Poll history until a new assistant turn appears after the message we sent
  const sentAt = Date.now()
  for (let i = 0; i < HERMES_POLL_MAX_ATTEMPTS; i++) {
    await new Promise(r => setTimeout(r, HERMES_POLL_INTERVAL_MS))
    const histRes = await fetch(`${base}/api/session-history?sessionKey=${HERMES_SESSION_KEY}&limit=20`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => null)
    if (!histRes?.ok) continue
    const data = (await histRes.json()) as { messages?: Array<{ role: string; content: string; created_at?: string }> }
    const msgs = data.messages ?? []
    const newAssistant = msgs.find(m =>
      m.role === 'assistant' &&
      (m.created_at ? Date.parse(m.created_at) > sentAt - 500 : true)
    )
    if (newAssistant?.content) {
      return { reply: newAssistant.content, live: true, model: 'hermes-agent' }
    }
  }
  throw new Error('Hermes reply timeout')
}

// ── Keyword fallback ──────────────────────────────────────────────────────────

function fallbackReply(text: string): string {
  const t = text.toLowerCase()
  const name = brandName()
  if (/\b(hi|hello|hey)\b/.test(t)) return `Hi! I'm the ${name} assistant. I can help you manage conversations, contacts, campaigns, social posts, appointments, pages, automations and more. What would you like to do?`
  if (t.includes('campaign')) return `You can create and send email campaigns from the Campaigns module. Tell me the audience and subject, and I'll help you draft it.`
  if (t.includes('appointment') || t.includes('schedule')) return `Appointments live in the Appointments module. I can help you book, reschedule, or review upcoming visits.`
  if (t.includes('social') || t.includes('post')) return `I can help you draft and schedule social posts in the Social module.`
  if (t.includes('automation')) return `The Automations module lets you build IF/THEN rules — pick a trigger, add conditions, and define actions like sending emails, updating stages, or creating tasks.`
  if (t.includes('lead') || t.includes('contact')) return `Your pipeline is in the Contacts module. I can summarise new leads or help you follow up.`
  if (t.includes('knowledge') || t.includes('brand')) return `Add entries to the Knowledge Vault and I'll use them as context in every reply — brand voice, ICP, services, FAQs, and more.`
  return `I've noted: "${text.slice(0, 80)}". To get live AI replies, set OPENROUTER_API_KEY in your .env file. Until then I'm operating in offline mode, but can still guide you through any module.`
}

// ── Route handler ─────────────────────────────────────────────────────────────

export function registerChat(app: Hono): void {
  app.post('/api/chat', async (c) => {
    const b = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
    const raw = Array.isArray(b.messages) ? b.messages : []
    const messages: ChatMessage[] = raw
      .filter((m): m is { role: string; content: string } =>
        !!m && typeof (m as Record<string, unknown>).content === 'string')
      .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))

    if (messages.length === 0) return c.json({ error: 'messages is required' }, 400)

    // 1. OpenRouter (preferred — cheapest path, full context)
    if (process.env.OPENROUTER_API_KEY) {
      try {
        const result = await callOpenRouter(messages)
        return c.json({ ...result, brand: brandName() })
      } catch (err) {
        console.error('[chat] OpenRouter error:', (err as Error).message)
        // fall through to next adapter
      }
    }

    // 2. Hermes bridge (if configured)
    if (process.env.HERMES_API_URL) {
      try {
        const result = await callHermesBridge(messages)
        return c.json({ ...result, brand: brandName() })
      } catch (err) {
        console.error('[chat] Hermes bridge error:', (err as Error).message)
        // fall through to fallback
      }
    }

    // 3. Offline keyword fallback
    const reply = fallbackReply(messages[messages.length - 1]?.content ?? '')
    return c.json({ reply, live: false, model: 'fallback', brand: brandName() })
  })

  // Health check — tells the UI which backend is active
  app.get('/api/chat/status', (c) => {
    const hasOpenRouter = !!process.env.OPENROUTER_API_KEY
    const hasHermes = !!process.env.HERMES_API_URL
    return c.json({
      backend: hasOpenRouter ? 'openrouter' : hasHermes ? 'hermes' : 'fallback',
      model: hasOpenRouter ? defaultModel() : hasHermes ? 'hermes-agent' : 'fallback',
      live: hasOpenRouter || hasHermes,
    })
  })
}
