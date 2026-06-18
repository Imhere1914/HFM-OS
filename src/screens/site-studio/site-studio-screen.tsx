/**
 * Site Studio — Lovable-style creative hub.
 * LEFT: collapsible archive sidebar (Websites + Landing Pages + Media assets)
 * CENTER: Build / Preview / Code / Media tabs with AI-prompt canvas
 * AI prompting → dev tasks → live preview, exactly like before but richer layout.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Add01Icon,
  ArrowLeft01Icon,
  Cancel01Icon,
  CodeIcon,
  Copy01Icon,
  Delete01Icon,
  Download01Icon,
  EyeIcon,
  Globe02Icon,
  ImageAdd01Icon,
  Layout01Icon,
  Loading03Icon,
  Rocket01Icon,
  SentIcon,
  SparklesIcon,
  ArrowTurnBackwardIcon,
  Video01Icon,
  RefreshIcon,
  SourceCodeIcon,
} from '@hugeicons/core-free-icons'
import { useBrand } from '@/contexts/BrandContext'
import { toast } from '@/components/toast'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────────

type SiteKey = 'sc' | 'hfm'
type CenterTab = 'build' | 'preview' | 'code' | 'media'
type MediaTab = 'image' | 'video'
type DevTaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
type ArchiveItemType = 'website' | 'page'

interface ArchiveItem {
  id: string
  name: string
  type: ArchiveItemType
  status: 'live' | 'draft'
  lastEdited: string
  url?: string
  thumbnail?: string
}

interface SiteCommit { hash: string; subject: string }
interface SiteStatus { key: SiteKey; name: string; url: string; lastCommits: SiteCommit[] }
interface SiteStudioStatus { server: boolean; anthropic_key_set: boolean; sites: SiteStatus[] }
interface DevTask { id: string; prompt: string; status: DevTaskStatus; created_at: string }
interface EditRequest { taskId: string; prompt: string; site: SiteKey }
interface GeneratedImage { url: string; prompt: string; id: string }

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<DevTaskStatus, string> = {
  queued: '#94a3b8', running: '#f59e0b',
  completed: '#10b981', failed: '#ef4444', cancelled: '#94a3b8',
}
const STATUS_DOT: Record<DevTaskStatus, string> = {
  queued: '○', running: '◉', completed: '●', failed: '✕', cancelled: '–',
}

const EXAMPLE_PROMPTS = [
  'Update the hero headline',
  'Add a testimonials section',
  'Make CTAs more prominent',
  'Add an FAQ section',
  'Change the color palette',
]

const IMG_STYLE_OPTIONS = [
  'Photorealistic', 'Digital Art', 'Watercolor', 'Cinematic', 'Minimalist', 'Abstract',
]

// ── LocalStorage helpers ────────────────────────────────────────────────────────

function loadEdits(site: SiteKey): EditRequest[] {
  try {
    const raw = localStorage.getItem(`site-studio-edits-${site}`)
    const parsed = raw ? (JSON.parse(raw) as EditRequest[]) : []
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}
function saveEdits(site: SiteKey, edits: EditRequest[]): void {
  try { localStorage.setItem(`site-studio-edits-${site}`, JSON.stringify(edits.slice(0, 30))) } catch { /* ignore */ }
}

function loadArchive(): ArchiveItem[] {
  try {
    const raw = localStorage.getItem('site-studio-archive')
    const parsed = raw ? (JSON.parse(raw) as ArchiveItem[]) : []
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}
function saveArchive(items: ArchiveItem[]): void {
  try { localStorage.setItem('site-studio-archive', JSON.stringify(items)) } catch { /* ignore */ }
}

function loadImages(): GeneratedImage[] {
  try {
    const raw = localStorage.getItem('site-studio-images')
    const parsed = raw ? (JSON.parse(raw) as GeneratedImage[]) : []
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}
function saveImages(imgs: GeneratedImage[]): void {
  try { localStorage.setItem('site-studio-images', JSON.stringify(imgs.slice(0, 50))) } catch { /* ignore */ }
}

// ── Archive Sidebar ─────────────────────────────────────────────────────────────

function ArchiveSidebar({
  archive, onSelect, onNew, onDelete, selectedId, accent,
}: {
  archive: ArchiveItem[]
  onSelect: (item: ArchiveItem) => void
  onNew: (type: ArchiveItemType) => void
  onDelete: (id: string) => void
  selectedId: string | null
  accent: string
}) {
  const [websitesOpen, setWebsitesOpen] = useState(true)
  const [pagesOpen, setPagesOpen] = useState(true)

  const websites = archive.filter(a => a.type === 'website')
  const pages = archive.filter(a => a.type === 'page')

  const renderItem = (item: ArchiveItem) => (
    <div
      key={item.id}
      onClick={() => onSelect(item)}
      className="group flex items-start gap-2.5 rounded-xl px-3 py-2.5 cursor-pointer transition-all"
      style={{
        background: selectedId === item.id ? `color-mix(in srgb, ${accent} 10%, transparent)` : 'transparent',
        border: selectedId === item.id ? `1px solid color-mix(in srgb, ${accent} 25%, transparent)` : '1px solid transparent',
      }}
    >
      <div
        className="mt-0.5 h-8 w-10 shrink-0 rounded-lg overflow-hidden"
        style={{ background: 'var(--theme-hover)' }}
      >
        {item.thumbnail ? (
          <img src={item.thumbnail} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <HugeiconsIcon
              icon={item.type === 'website' ? Globe02Icon : Layout01Icon}
              size={14} style={{ color: accent, opacity: 0.5 }}
            />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium text-[var(--theme-text)]">{item.name}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span
            className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
            style={{
              background: item.status === 'live' ? 'rgba(16,185,129,0.12)' : 'rgba(148,163,184,0.12)',
              color: item.status === 'live' ? '#10b981' : '#94a3b8',
            }}
          >
            {item.status}
          </span>
          <span className="text-[9px] text-[var(--theme-muted)]">{item.lastEdited}</span>
        </div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete(item.id) }}
        className="mt-0.5 shrink-0 rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10"
      >
        <HugeiconsIcon icon={Delete01Icon} size={11} style={{ color: '#ef4444' }} />
      </button>
    </div>
  )

  const SectionHeader = ({
    label, open, onToggle, onAdd, count,
  }: { label: string; open: boolean; onToggle: () => void; onAdd: () => void; count: number }) => (
    <div className="flex items-center gap-1 px-2 py-1.5">
      <button
        onClick={onToggle}
        className="flex min-w-0 flex-1 items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--theme-muted)] hover:text-[var(--theme-text)] transition-colors"
      >
        <span style={{ transform: open ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>›</span>
        {label}
        <span className="rounded-full px-1.5 py-0.5 text-[9px]" style={{ background: 'var(--theme-hover)' }}>{count}</span>
      </button>
      <button
        onClick={onAdd}
        className="rounded-lg p-1 hover:bg-[var(--theme-hover)] transition-colors"
        title={`New ${label.toLowerCase().slice(0, -1)}`}
      >
        <HugeiconsIcon icon={Add01Icon} size={12} style={{ color: accent }} />
      </button>
    </div>
  )

  return (
    <div
      className="flex h-full flex-col border-r overflow-hidden"
      style={{ background: 'var(--theme-card)', borderColor: 'var(--theme-border)', width: '240px', minWidth: '240px' }}
    >
      <div className="border-b px-3 py-3" style={{ borderColor: 'var(--theme-border)' }}>
        <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--theme-muted)]">Archive</p>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        <SectionHeader
          label="Websites" open={websitesOpen} onToggle={() => setWebsitesOpen(v => !v)}
          onAdd={() => onNew('website')} count={websites.length}
        />
        {websitesOpen && (
          <div className="mb-2 px-1">
            {websites.length === 0 ? (
              <p className="px-3 py-2 text-[11px] text-[var(--theme-muted)]">No websites yet</p>
            ) : websites.map(renderItem)}
          </div>
        )}

        <div className="my-1 mx-3 h-px" style={{ background: 'var(--theme-border)' }} />

        <SectionHeader
          label="Landing Pages" open={pagesOpen} onToggle={() => setPagesOpen(v => !v)}
          onAdd={() => onNew('page')} count={pages.length}
        />
        {pagesOpen && (
          <div className="px-1">
            {pages.length === 0 ? (
              <p className="px-3 py-2 text-[11px] text-[var(--theme-muted)]">No landing pages yet</p>
            ) : pages.map(renderItem)}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Edit Request Item ──────────────────────────────────────────────────────────

function EditItem({ req }: { req: EditRequest & { status?: DevTaskStatus } }) {
  const status = req.status ?? 'queued'
  return (
    <div
      className="rounded-xl border p-3 cursor-pointer transition-all"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-bg)' }}
      onClick={() => {/* expand edit detail in future */}}
    >
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-mono" style={{ color: STATUS_COLOR[status] }}>
          {STATUS_DOT[status]}
        </span>
        <p className="min-w-0 flex-1 truncate text-[12px] text-[var(--theme-text)]">{req.prompt}</p>
        <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{
          background: `color-mix(in srgb, ${STATUS_COLOR[status]} 12%, transparent)`,
          color: STATUS_COLOR[status],
        }}>
          {status}
        </span>
      </div>
    </div>
  )
}

// ── Image Generator ────────────────────────────────────────────────────────────

function ImageGenerator({ accent }: { accent: string }) {
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState('Photorealistic')
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<GeneratedImage[]>(() => loadImages())

  const generate = async () => {
    if (!prompt.trim() || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/media/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `${style}: ${prompt}`, size: '1024x1024' }),
      })
      if (!res.ok) throw new Error('Generation failed')
      const data = await res.json() as { url?: string; image_url?: string }
      const url = data.url ?? data.image_url ?? ''
      if (url) {
        const next = [{ id: Date.now().toString(), url, prompt: `${style}: ${prompt}` }, ...images]
        setImages(next)
        saveImages(next)
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Image generation failed', { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const gradient = `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 65%, #000))`
  const glow = `0 2px 8px color-mix(in srgb, ${accent} 38%, transparent)`

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-6">
      {/* Prompt area */}
      <div className="rounded-2xl border p-5" style={{ background: 'var(--theme-card)', borderColor: 'var(--theme-border)' }}>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[var(--theme-muted)]">Generate Image</p>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void generate() }}
          placeholder="Describe the image you want to create…"
          rows={3}
          className="w-full resize-none rounded-xl border px-3 py-2.5 text-[13px] outline-none"
          style={{ background: 'var(--theme-input)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
        />
        {/* Style chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {IMG_STYLE_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className="rounded-full px-3 py-1 text-[11px] font-medium transition-all"
              style={{
                background: style === s ? `color-mix(in srgb, ${accent} 15%, transparent)` : 'var(--theme-hover)',
                color: style === s ? accent : 'var(--theme-muted)',
                border: style === s ? `1px solid color-mix(in srgb, ${accent} 30%, transparent)` : '1px solid transparent',
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          onClick={() => void generate()}
          disabled={!prompt.trim() || loading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold text-white disabled:opacity-40"
          style={{ background: gradient, boxShadow: glow }}
        >
          {loading ? <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" /> : <HugeiconsIcon icon={SparklesIcon} size={14} />}
          {loading ? 'Generating…' : 'Generate'}
        </button>
      </div>

      {/* Image grid */}
      {images.length > 0 && (
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[var(--theme-muted)]">Generated Images</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map(img => (
              <div key={img.id} className="group relative overflow-hidden rounded-xl" style={{ aspectRatio: '1' }}>
                <img src={img.url} alt={img.prompt} className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={img.url} download target="_blank" rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    onClick={e => e.stopPropagation()}
                  >
                    <HugeiconsIcon icon={Download01Icon} size={14} className="text-white" />
                  </a>
                  <button
                    onClick={() => {
                      void navigator.clipboard.writeText(img.url)
                      toast('URL copied')
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <HugeiconsIcon icon={Copy01Icon} size={14} className="text-white" />
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="truncate text-[9px] text-white/70">{img.prompt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Video Generator ────────────────────────────────────────────────────────────

function VideoGenerator({ accent }: { accent: string }) {
  const [script, setScript] = useState('')
  const [videoStyle, setVideoStyle] = useState('Cinematic')
  const [loading, setLoading] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')

  const VIDEO_STYLES = ['Cinematic', 'Product Demo', 'Explainer', 'Social Story', 'Documentary']
  const gradient = `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 65%, #000))`

  const generate = async () => {
    if (!script.trim() || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/media/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: script, style: videoStyle }),
      })
      if (!res.ok) throw new Error('Video generation failed')
      const data = await res.json() as { url?: string; video_url?: string }
      setVideoUrl(data.url ?? data.video_url ?? '')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Video generation failed', { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-6">
      <div className="rounded-2xl border p-5" style={{ background: 'var(--theme-card)', borderColor: 'var(--theme-border)' }}>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[var(--theme-muted)]">Generate Video</p>
        <textarea
          value={script}
          onChange={e => setScript(e.target.value)}
          placeholder="Describe your video or paste a script…"
          rows={5}
          className="w-full resize-none rounded-xl border px-3 py-2.5 text-[13px] outline-none"
          style={{ background: 'var(--theme-input)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {VIDEO_STYLES.map(s => (
            <button
              key={s}
              onClick={() => setVideoStyle(s)}
              className="rounded-full px-3 py-1 text-[11px] font-medium transition-all"
              style={{
                background: videoStyle === s ? `color-mix(in srgb, ${accent} 15%, transparent)` : 'var(--theme-hover)',
                color: videoStyle === s ? accent : 'var(--theme-muted)',
                border: videoStyle === s ? `1px solid color-mix(in srgb, ${accent} 30%, transparent)` : '1px solid transparent',
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          onClick={() => void generate()}
          disabled={!script.trim() || loading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold text-white disabled:opacity-40"
          style={{ background: gradient }}
        >
          {loading ? <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" /> : <HugeiconsIcon icon={Video01Icon} size={14} />}
          {loading ? 'Generating…' : 'Generate Video'}
        </button>
      </div>

      {videoUrl && (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--theme-border)' }}>
          <video src={videoUrl} controls className="w-full" />
          <div className="flex gap-2 border-t p-3" style={{ borderColor: 'var(--theme-border)' }}>
            <a
              href={videoUrl} download target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--theme-hover)]"
              style={{ color: accent }}
            >
              <HugeiconsIcon icon={Download01Icon} size={13} />
              Download
            </a>
          </div>
        </div>
      )}

      {!videoUrl && !loading && (
        <div className="flex flex-col items-center justify-center rounded-2xl border py-16 text-center" style={{ borderColor: 'var(--theme-border)', borderStyle: 'dashed' }}>
          <HugeiconsIcon icon={Video01Icon} size={40} className="mb-3" style={{ color: accent, opacity: 0.3 }} />
          <p className="text-[13px] font-medium" style={{ color: 'var(--theme-muted)' }}>Your generated video will appear here</p>
        </div>
      )}
    </div>
  )
}

// ── Main Screen ─────────────────────────────────────────────────────────────────

type PipelinePhase = 'idle' | 'editing' | 'building' | 'deploying'

export function SiteStudioScreen() {
  const brand = useBrand()
  const accent = brand.accentColor
  const queryClient = useQueryClient()

  // Layout state
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024)
  const [centerTab, setCenterTab] = useState<CenterTab>('build')
  const [mediaTab, setMediaTab] = useState<MediaTab>('image')

  // Site state
  const [site, setSite] = useState<SiteKey>('sc')
  const [prompt, setPrompt] = useState('')
  const [edits, setEdits] = useState<EditRequest[]>(() => loadEdits('sc'))
  const [iframeKey, setIframeKey] = useState(0)
  const [buildOutput, setBuildOutput] = useState<{ ok: boolean; log: string } | null>(null)

  // Archive state
  const [archive, setArchive] = useState<ArchiveItem[]>(() => loadArchive())
  const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(null)

  // Auto-pipeline state (edit → build → deploy without manual intervention)
  const [pipelinePhase, setPipelinePhase] = useState<PipelinePhase>('idle')
  const [pipelineTaskId, setPipelineTaskId] = useState<string | null>(null)
  const isAutoPipelineRef = useRef(false)
  const buildTriggeredForRef = useRef<string | null>(null)

  // Live log state
  const [log, setLog] = useState('')
  const logOffsetRef = useRef(0)
  const logBoxRef = useRef<HTMLDivElement | null>(null)

  const persistEdits = useCallback((next: EditRequest[]) => {
    setEdits(next)
    saveEdits(site, next)
  }, [site])

  // ── Queries ──

  const statusQuery = useQuery<SiteStudioStatus>({
    queryKey: ['site-studio', 'status'],
    queryFn: async () => {
      const res = await fetch('/api/site-studio/status')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    refetchInterval: 30_000,
  })

  const editTasksQuery = useQuery<{ tasks: DevTask[] }>({
    queryKey: ['site-studio', 'tasks', site],
    queryFn: async () => {
      const res = await fetch(`/api/dev/tasks?brand=site-${site}`)
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    // Poll at 2s during active pipeline, 10s otherwise
    refetchInterval: pipelinePhase === 'editing' ? 2_000 : edits.length > 0 ? 10_000 : false,
    enabled: edits.length > 0 || pipelinePhase !== 'idle',
  })

  // ── Mutations (deploy must be defined before build so build's onSuccess can call it) ──

  const revertMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/site-studio/${site}/revert`, { method: 'POST' })
      return res.json() as Promise<{ ok: boolean; log: string }>
    },
    onSuccess: d => {
      if (d.ok) {
        toast('Reverted')
        setIframeKey(k => k + 1)
        void queryClient.invalidateQueries({ queryKey: ['site-studio', 'status'] })
      } else {
        toast('Revert failed', { type: 'error' })
      }
    },
  })

  const deployMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/site-studio/${site}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: edits[0]?.prompt }),
      })
      return res.json() as Promise<{ ok: boolean; log: string; commitHash?: string }>
    },
    onSuccess: d => {
      // Always reset pipeline on deploy completion
      isAutoPipelineRef.current = false
      setPipelinePhase('idle')
      setPipelineTaskId(null)
      setBuildOutput(d)
      if (d.ok) {
        toast(`Published${d.commitHash ? ` (${d.commitHash})` : ''}`)
        setIframeKey(k => k + 1)
        void queryClient.invalidateQueries({ queryKey: ['site-studio', 'status'] })
      } else {
        toast('Publish failed', { type: 'error' })
      }
    },
  })

  const buildMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/site-studio/${site}/build`, { method: 'POST' })
      return res.json() as Promise<{ ok: boolean; log: string }>
    },
    onSuccess: d => {
      setBuildOutput(d)
      if (isAutoPipelineRef.current) {
        // Auto-pipeline: on success deploy; on failure abort
        if (d.ok) {
          setPipelinePhase('deploying')
          deployMutation.mutate()
        } else {
          isAutoPipelineRef.current = false
          setPipelinePhase('idle')
          setPipelineTaskId(null)
          toast('Build failed — check log below', { type: 'error' })
        }
      } else {
        // Manual build
        if (d.ok) { toast('Build succeeded — reloading preview'); setIframeKey(k => k + 1) }
        else toast('Build failed', { type: 'error' })
      }
    },
  })

  const editMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`/api/site-studio/${site}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      })
      const d = await res.json() as { taskId?: string; error?: string }
      if (!res.ok || !d.taskId) throw new Error(d.error ?? 'Failed')
      return { taskId: d.taskId, prompt: text }
    },
    onSuccess: ({ taskId, prompt: text }) => {
      // Start auto-pipeline
      isAutoPipelineRef.current = true
      setPipelinePhase('editing')
      setPipelineTaskId(taskId)
      buildTriggeredForRef.current = null
      setLog('')
      logOffsetRef.current = 0
      persistEdits([{ taskId, prompt: text, site }, ...edits])
      setPrompt('')
      toast('Claude is editing the site…')
    },
    onError: e => toast(e instanceof Error ? e.message : 'Failed to start edit', { type: 'error' }),
  })

  // ── Effects ──

  // Reset on site switch
  useEffect(() => {
    setEdits(loadEdits(site))
    setBuildOutput(null)
    setLog('')
    logOffsetRef.current = 0
    setPipelinePhase('idle')
    setPipelineTaskId(null)
    isAutoPipelineRef.current = false
    buildTriggeredForRef.current = null
  }, [site])

  // Seed archive from server status when localStorage is empty
  useEffect(() => {
    const sitesData = statusQuery.data?.sites
    if (!sitesData) return
    if (archive.length > 0) return
    const seeded: ArchiveItem[] = sitesData.map(s => ({
      id: s.key,
      name: s.name,
      type: 'website' as ArchiveItemType,
      status: 'live' as const,
      lastEdited: 'Live',
    }))
    if (seeded.length > 0) {
      setArchive(seeded)
      saveArchive(seeded)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusQuery.data])

  const tasks = editTasksQuery.data?.tasks ?? []

  // Auto-pipeline: when edit task completes → trigger build automatically
  useEffect(() => {
    if (pipelinePhase !== 'editing' || !pipelineTaskId) return
    const task = tasks.find(t => t.id === pipelineTaskId)
    if (!task) return
    if (task.status === 'completed' && buildTriggeredForRef.current !== pipelineTaskId) {
      buildTriggeredForRef.current = pipelineTaskId
      setPipelinePhase('building')
      buildMutation.mutate()
    } else if (task.status === 'failed' || task.status === 'cancelled') {
      isAutoPipelineRef.current = false
      setPipelinePhase('idle')
      setPipelineTaskId(null)
      toast('Edit agent failed — see log below', { type: 'error' })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, pipelinePhase, pipelineTaskId])

  // Live log polling while pipeline task is active
  useEffect(() => {
    if (!pipelineTaskId) return
    const fetchLog = async () => {
      try {
        const res = await fetch(
          `/api/dev/tasks/${pipelineTaskId}/log?brand=site-${site}&offset=${logOffsetRef.current}`
        )
        if (!res.ok) return
        const d = await res.json() as { content: string; size: number }
        if (d.content) {
          setLog(prev => prev + d.content)
          logOffsetRef.current = d.size
        }
      } catch { /* transient — retry next tick */ }
    }
    void fetchLog()
    const interval = setInterval(() => void fetchLog(), 2000)
    return () => clearInterval(interval)
  }, [pipelineTaskId, site])

  // Auto-scroll log to bottom
  useEffect(() => {
    const box = logBoxRef.current
    if (box) box.scrollTop = box.scrollHeight
  }, [log])

  // ── Derived values ──

  const status = statusQuery.data
  const sites = status?.sites ?? []
  const current = sites.find(s => s.key === site)
  const siteUrl = current?.url ?? ''
  const busy = buildMutation.isPending || deployMutation.isPending || revertMutation.isPending || pipelinePhase !== 'idle'
  const apiKeyMissing = status?.server && !status?.anthropic_key_set

  const gradient = `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 65%, #000))`
  const glow = `0 2px 8px color-mix(in srgb, ${accent} 38%, transparent)`

  const enrichedEdits = edits.map(e => ({
    ...e,
    status: tasks.find(t => t.id === e.taskId)?.status,
  }))

  // Preview URL: always use the live public URL (SPA proxy breaks client-side routing)
  const previewSrc = siteUrl || null

  const handleNewArchiveItem = (type: ArchiveItemType) => {
    const name = window.prompt(`Name for new ${type === 'website' ? 'website' : 'landing page'}:`)
    if (!name?.trim()) return
    const item: ArchiveItem = {
      id: Date.now().toString(),
      name: name.trim(),
      type,
      status: 'draft',
      lastEdited: new Date().toLocaleDateString(),
    }
    const next = [item, ...archive]
    setArchive(next)
    saveArchive(next)
    setSelectedArchiveId(item.id)
  }

  const handleDeleteArchiveItem = (id: string) => {
    const next = archive.filter(a => a.id !== id)
    setArchive(next)
    saveArchive(next)
    if (selectedArchiveId === id) setSelectedArchiveId(null)
  }

  const CENTER_TABS: { key: CenterTab; label: string; icon: typeof EyeIcon }[] = [
    { key: 'build', label: 'Build', icon: SparklesIcon },
    { key: 'preview', label: 'Preview', icon: EyeIcon },
    { key: 'code', label: 'Code', icon: CodeIcon },
    { key: 'media', label: 'Media', icon: ImageAdd01Icon },
  ]

  const PIPELINE_LABEL: Record<PipelinePhase, string> = {
    idle: '',
    editing: 'Claude is editing the site…',
    building: 'Building changes…',
    deploying: 'Publishing to live site…',
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <StudioStyles />

      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 border-b px-4 py-2.5" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-card)' }}>
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ background: gradient, boxShadow: glow }}
        >
          <HugeiconsIcon icon={Globe02Icon} size={16} />
        </div>
        <div className="min-w-0">
          <h1 className="text-[14px] font-bold text-[var(--theme-text)]">Site Studio</h1>
          <p className="text-[10px] text-[var(--theme-muted)]">Build, preview, and publish with AI</p>
        </div>

        <button
          onClick={() => setSidebarOpen(v => !v)}
          className="ml-2 rounded-lg p-1.5 transition-colors hover:bg-[var(--theme-hover)]"
          title="Toggle archive"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} className="text-[var(--theme-muted)]"
            style={{ transform: sidebarOpen ? 'none' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
        </button>

        <div
          className="ml-2 flex rounded-xl border p-0.5"
          style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-bg)' }}
        >
          {CENTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setCenterTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all',
                centerTab === tab.key ? 'text-[var(--theme-text)]' : 'text-[var(--theme-muted)] hover:text-[var(--theme-text)]'
              )}
              style={centerTab === tab.key ? { background: `color-mix(in srgb, ${accent} 12%, var(--theme-card))`, color: accent } : undefined}
            >
              <HugeiconsIcon icon={tab.icon} size={12} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-lg border p-0.5" style={{ borderColor: 'var(--theme-border)' }}>
            {(['sc', 'hfm'] as const).map(k => {
              const s = sites.find(x => x.key === k)
              const label = s?.name ?? (k === 'sc' ? 'SC' : 'HFM')
              return (
                <button
                  key={k}
                  onClick={() => setSite(k)}
                  className={cn('rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                    site === k ? 'text-[var(--theme-text)]' : 'text-[var(--theme-muted)] hover:bg-[var(--theme-hover)]'
                  )}
                  style={site === k ? { background: 'var(--theme-accent-soft)' } : undefined}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {centerTab !== 'media' && (
            <>
              <button
                onClick={() => buildMutation.mutate()}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold transition-all disabled:opacity-40"
                style={{ background: 'var(--theme-hover)', color: 'var(--theme-text)' }}
              >
                {buildMutation.isPending ? <HugeiconsIcon icon={Loading03Icon} size={12} className="animate-spin" /> : <HugeiconsIcon icon={RefreshIcon} size={12} />}
                Build
              </button>
              <button
                onClick={() => { if (window.confirm(`Publish to ${siteUrl}?`)) deployMutation.mutate() }}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold text-white transition-all disabled:opacity-40"
                style={{ background: gradient, boxShadow: glow }}
              >
                <HugeiconsIcon icon={Rocket01Icon} size={12} />
                {deployMutation.isPending ? 'Publishing…' : 'Publish'}
              </button>
              <button
                onClick={() => { if (window.confirm('Revert last change?')) revertMutation.mutate() }}
                disabled={busy}
                className="rounded-xl p-1.5 transition-colors hover:bg-red-500/10 disabled:opacity-40"
                title="Revert"
              >
                <HugeiconsIcon icon={ArrowTurnBackwardIcon} size={14} style={{ color: '#ef4444' }} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {sidebarOpen && (
          <ArchiveSidebar
            archive={archive}
            onSelect={item => setSelectedArchiveId(item.id)}
            onNew={handleNewArchiveItem}
            onDelete={handleDeleteArchiveItem}
            selectedId={selectedArchiveId}
            accent={accent}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Build tab */}
          {centerTab === 'build' && (
            <div className="flex min-h-0 flex-1 overflow-hidden">
              {/* Prompt + log panel */}
              <div
                className="flex w-[360px] shrink-0 flex-col border-r"
                style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-card)' }}
              >
                {/* API key warning banner */}
                {apiKeyMissing && (
                  <div className="border-b px-4 py-3" style={{ borderColor: '#f59e0b44', background: 'rgba(245,158,11,0.08)' }}>
                    <p className="text-[11px] font-bold text-amber-400">⚠ ANTHROPIC_API_KEY not set</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-amber-300/80">
                      Claude Code cannot run site edits. SSH to the server and add
                      <code className="mx-1 rounded bg-amber-500/10 px-1 py-0.5">ANTHROPIC_API_KEY=sk-ant-…</code>
                      to <code className="rounded bg-amber-500/10 px-1 py-0.5">/opt/ai-os/.env</code>, then run:<br />
                      <code className="mt-1 block rounded bg-amber-500/10 px-2 py-1">
                        systemctl restart ai-os-hfm ai-os-sc
                      </code>
                    </p>
                  </div>
                )}

                <div className="border-b p-4" style={{ borderColor: 'var(--theme-border)' }}>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--theme-muted)]">
                    Describe a change
                  </p>
                  <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) editMutation.mutate(prompt.trim()) }}
                    placeholder="What would you like to build or change?"
                    rows={4}
                    className="w-full resize-none rounded-xl border px-3 py-2.5 text-[13px] outline-none placeholder:text-[var(--theme-muted)]"
                    style={{ background: 'var(--theme-input)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                  />
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {EXAMPLE_PROMPTS.map(ex => (
                      <button
                        key={ex}
                        onClick={() => setPrompt(ex)}
                        className="flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors"
                        style={{
                          borderColor: `color-mix(in srgb, ${accent} 25%, var(--theme-border))`,
                          color: 'var(--theme-muted)',
                          background: `color-mix(in srgb, ${accent} 5%, transparent)`,
                        }}
                      >
                        <HugeiconsIcon icon={SparklesIcon} size={9} />
                        {ex}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => editMutation.mutate(prompt.trim())}
                    disabled={!prompt.trim() || editMutation.isPending || pipelinePhase !== 'idle'}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold text-white disabled:opacity-40"
                    style={{ background: gradient, boxShadow: glow }}
                  >
                    <HugeiconsIcon icon={editMutation.isPending ? Loading03Icon : SentIcon} size={14}
                      className={editMutation.isPending ? 'animate-spin' : ''} />
                    {editMutation.isPending ? 'Queuing…' : 'Send  ⌘↵'}
                  </button>
                </div>

                {/* Pipeline status + live log */}
                {pipelinePhase !== 'idle' && (
                  <div className="border-b p-3" style={{ borderColor: 'var(--theme-border)' }}>
                    <div className="mb-2 flex items-center gap-2">
                      <HugeiconsIcon icon={Loading03Icon} size={12} className="animate-spin shrink-0" style={{ color: accent }} />
                      <span className="text-[11px] font-semibold" style={{ color: accent }}>
                        {PIPELINE_LABEL[pipelinePhase]}
                      </span>
                    </div>
                    {log && (
                      <div
                        ref={logBoxRef}
                        className="max-h-48 overflow-y-auto rounded-lg p-2"
                        style={{ background: '#0d1117' }}
                      >
                        <pre className="whitespace-pre-wrap text-[9px] font-mono leading-relaxed" style={{ color: '#7ee787' }}>
                          {log}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Edit history */}
                <div className="flex-1 overflow-y-auto p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--theme-muted)]">
                    Edit History
                  </p>
                  {enrichedEdits.length === 0 ? (
                    <p className="py-4 text-center text-[12px] text-[var(--theme-muted)]">No edits yet — describe a change above</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {enrichedEdits.map(e => (
                        <EditItem key={e.taskId} req={e} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Build output (only shown for manual builds) */}
                {buildOutput && pipelinePhase === 'idle' && (
                  <div className="border-t p-3" style={{ borderColor: 'var(--theme-border)' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: buildOutput.ok ? '#10b981' : '#ef4444' }}>
                        {buildOutput.ok ? 'Build OK' : 'Build Failed'}
                      </span>
                      <button onClick={() => setBuildOutput(null)} className="text-[var(--theme-muted)]">
                        <HugeiconsIcon icon={Cancel01Icon} size={12} />
                      </button>
                    </div>
                    <pre className="max-h-28 overflow-y-auto whitespace-pre-wrap text-[10px] text-[var(--theme-muted)]">
                      {buildOutput.log}
                    </pre>
                  </div>
                )}
              </div>

              {/* Preview iframe — uses internal proxy when server present */}
              <div className="flex min-w-0 flex-1 flex-col bg-[var(--theme-bg)]">
                {status && !status.server ? (
                  <div className="flex flex-1 items-center justify-center p-8 text-center">
                    <div>
                      <HugeiconsIcon icon={Globe02Icon} size={40} className="mx-auto mb-4" style={{ color: accent, opacity: 0.3 }} />
                      <p className="text-[14px] font-semibold text-[var(--theme-text)]">Site Studio requires server repos</p>
                      <p className="mt-1 text-[12px] text-[var(--theme-muted)]">
                        Edits and deploys run against staged site repos on the VPS, which aren't present here.
                      </p>
                    </div>
                  </div>
                ) : previewSrc ? (
                  <iframe
                    key={iframeKey}
                    src={previewSrc}
                    className="h-full w-full border-0"
                    title={`Preview — ${current?.name}`}
                  />
                ) : (
                  <div className="flex flex-1 items-center justify-center">
                    <p className="text-[13px] text-[var(--theme-muted)]">Select a site to preview</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Preview tab — fullscreen */}
          {centerTab === 'preview' && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center gap-2 border-b px-4 py-2" style={{ borderColor: 'var(--theme-border)' }}>
                <span className="flex-1 truncate text-[12px] font-mono text-[var(--theme-muted)]">
                  {siteUrl || 'No site URL'}
                </span>
                <button onClick={() => setIframeKey(k => k + 1)} className="rounded-lg p-1 hover:bg-[var(--theme-hover)]">
                  <HugeiconsIcon icon={RefreshIcon} size={14} className="text-[var(--theme-muted)]" />
                </button>
              </div>
              {previewSrc ? (
                <iframe key={`preview-${iframeKey}`} src={previewSrc} className="flex-1 w-full border-0" title="Full preview" />
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-[13px] text-[var(--theme-muted)]">No live URL for selected site</p>
                </div>
              )}
            </div>
          )}

          {/* Code tab */}
          {centerTab === 'code' && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
              <div className="rounded-2xl border flex-1 overflow-hidden" style={{ borderColor: 'var(--theme-border)' }}>
                <div className="flex items-center gap-2 border-b px-4 py-2" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-card)' }}>
                  <HugeiconsIcon icon={SourceCodeIcon} size={14} className="text-[var(--theme-muted)]" />
                  <span className="text-[12px] text-[var(--theme-muted)]">Source Code</span>
                </div>
                <div className="flex flex-1 items-center justify-center p-8 text-center">
                  <div>
                    <HugeiconsIcon icon={CodeIcon} size={40} className="mx-auto mb-4" style={{ color: accent, opacity: 0.25 }} />
                    <p className="text-[14px] font-semibold text-[var(--theme-text)]">Code view coming soon</p>
                    <p className="mt-1 text-[12px] text-[var(--theme-muted)]">
                      Browse and edit generated HTML/CSS/JS directly in a future update.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Media tab */}
          {centerTab === 'media' && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex items-center gap-4 border-b px-6 py-2" style={{ borderColor: 'var(--theme-border)' }}>
                {([
                  { key: 'image' as const, label: 'Image Generation', icon: ImageAdd01Icon },
                  { key: 'video' as const, label: 'Video Generation', icon: Video01Icon },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setMediaTab(tab.key)}
                    className={cn('flex items-center gap-1.5 border-b-2 pb-2 text-[12px] font-semibold transition-colors -mb-px',
                      mediaTab === tab.key ? 'border-current' : 'border-transparent text-[var(--theme-muted)] hover:text-[var(--theme-text)]'
                    )}
                    style={mediaTab === tab.key ? { color: accent, borderColor: accent } : undefined}
                  >
                    <HugeiconsIcon icon={tab.icon} size={13} />
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {mediaTab === 'image' && <ImageGenerator accent={accent} />}
                {mediaTab === 'video' && <VideoGenerator accent={accent} />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StudioStyles() {
  return (
    <style>{`
      @keyframes studioFadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `}</style>
  )
}
