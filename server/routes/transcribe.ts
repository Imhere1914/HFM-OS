import type { Hono } from 'hono'

// ── Gladia v2 transcription ───────────────────────────────────────────────────

async function transcribeWithGladia(audioFile: Blob, apiKey: string): Promise<string> {
  // Step 1: upload audio → get hosted URL
  const uploadForm = new FormData()
  uploadForm.append('audio', audioFile, 'audio.webm')

  const uploadRes = await fetch('https://api.gladia.io/v2/upload', {
    method: 'POST',
    headers: { 'x-gladia-key': apiKey },
    body: uploadForm,
  })
  if (!uploadRes.ok) throw new Error(`Gladia upload ${uploadRes.status}: ${await uploadRes.text()}`)
  const { audio_url } = await uploadRes.json() as { audio_url: string }

  // Step 2: submit transcription job
  const jobRes = await fetch('https://api.gladia.io/v2/pre-recorded', {
    method: 'POST',
    headers: { 'x-gladia-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio_url, language: 'en', diarization: false }),
  })
  if (!jobRes.ok) throw new Error(`Gladia job ${jobRes.status}: ${await jobRes.text()}`)
  const { id } = await jobRes.json() as { id: string }

  // Step 3: poll until done (Gladia is typically <2s for short clips)
  for (let i = 0; i < 24; i++) {
    await new Promise(r => setTimeout(r, 500))
    const pollRes = await fetch(`https://api.gladia.io/v2/pre-recorded/${id}`, {
      headers: { 'x-gladia-key': apiKey },
    })
    const data = await pollRes.json() as {
      status: string
      result?: { transcription?: { full_transcript?: string } }
    }
    if (data.status === 'done') return data.result?.transcription?.full_transcript ?? ''
    if (data.status === 'error') throw new Error('Gladia transcription error')
  }
  throw new Error('Gladia transcription timed out')
}

// ── Whisper fallback ──────────────────────────────────────────────────────────

async function transcribeWithWhisper(audioFile: Blob, apiKey: string): Promise<string> {
  const fd = new FormData()
  fd.append('file', audioFile, 'audio.webm')
  fd.append('model', 'whisper-1')
  fd.append('language', 'en')

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: fd,
  })
  if (!res.ok) throw new Error(`Whisper ${res.status}: ${await res.text()}`)
  const data = await res.json() as { text: string }
  return data.text
}

// ── Route ─────────────────────────────────────────────────────────────────────

export function registerTranscribe(app: Hono) {
  app.post('/api/transcribe', async (c) => {
    try {
      const formData = await c.req.formData()
      const audioFile = formData.get('audio')
      if (!audioFile || typeof audioFile === 'string') {
        return c.json({ error: 'No audio file provided' }, 400)
      }

      const gladiaKey = process.env.GLADIA_API_KEY
      const openaiKey = process.env.OPENAI_API_KEY

      if (!gladiaKey && !openaiKey) {
        return c.json({ error: 'GLADIA_API_KEY or OPENAI_API_KEY required for transcription' }, 503)
      }

      let transcript: string

      if (gladiaKey) {
        transcript = await transcribeWithGladia(audioFile as Blob, gladiaKey)
      } else {
        transcript = await transcribeWithWhisper(audioFile as Blob, openaiKey!)
      }

      return c.json({ transcript })
    } catch (e) {
      return c.json({ error: (e as Error).message }, 500)
    }
  })
}
