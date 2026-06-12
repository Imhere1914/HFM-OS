import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { speakText, stopSpeech } from '@/lib/speak'
import {
  BookOpen01Icon,
  CheckmarkCircle01Icon,
  CheckmarkSquare02Icon,
  Clock01Icon,
  File01Icon,
  FileAudioIcon,
  Fire03Icon,
  LockIcon,
  Mic01Icon,
  PauseIcon,
  PlayIcon,
  Quiz03Icon,
  SchoolIcon,
  UserGroupIcon,
  VideoIcon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  HonourStarIcon,
} from '@hugeicons/core-free-icons'
import {
  lessonAccessState,
  starsForLesson,
  loadGamification,
  saveGamification,
  recordLessonStars,
  recordQuizScore,
  recordStudyDay,
  maybeAwardBadge,
  currentStreakDisplay,
  totalStars,
  MODULE_ORDER,
  QUIZ_TIME_PER_Q,
  PASS_THRESHOLD,
  type GamificationState,
  type LessonAccess,
  type ModuleBadge,
} from '@/lib/training-progress'

// ── Types ─────────────────────────────────────────────────────────────────────

type LessonType = 'text' | 'video' | 'audio' | 'pdf' | 'quiz'
type QuizPhase = 'question' | 'answered' | 'complete'

interface QuizQuestion {
  id: string
  question: string
  type: 'multiple_choice' | 'true_false' | 'short_answer'
  options?: string[]
  correct_answer?: string
  explanation?: string
}

interface Lesson {
  id: string
  title: string
  type: LessonType
  content_html?: string
  video_url?: string
  audio_url?: string
  pdf_url?: string
  image_urls?: string[]
  duration_minutes?: number
  quiz_questions?: QuizQuestion[]
  order: number
  is_preview: boolean
}

interface TrainingModule {
  id: string
  brand: string
  title: string
  slug: string
  description: string
  category: string
  thumbnail_url?: string
  instructor_name?: string
  instructor_bio?: string
  status: string
  is_free: boolean
  price_cents?: number
  lessons: Lesson[]
  tags: string[]
  total_duration_minutes: number
  enrolled_count: number
}

interface Enrollment {
  id: string
  module_id: string
  contact_name: string
  contact_email?: string
  progress: number
  completed_lessons: string[]
  started_at: string
  completed_at?: string
  last_accessed_at: string
}

interface ContentSection {
  index: number
  level: 2 | 3
  title: string
  html: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LESSON_ICONS: Record<LessonType, typeof BookOpen01Icon> = {
  text: BookOpen01Icon,
  video: VideoIcon,
  audio: FileAudioIcon,
  pdf: File01Icon,
  quiz: Quiz03Icon,
}

const ENROLLMENT_KEY = (id: string) => `hfm_enrollment_${id}`

const CATEGORY_HERO: Record<string, string> = {
  'Holistic Foundations':    'photo-1506905925346-21bda4d32df4',
  'Mind-Body Connection':    'photo-1544367567-0f2fcb009e0b',
  'Energy Medicine':         'photo-1518531933037-91b2f5f229cc',
  'Functional Nutrition':    'photo-1490645935967-10de6ba17061',
  'Metaphysical Wellness':   'photo-1574169208507-84376144848b',
}

const SECTION_ACCENT = ['#c4a04e', '#7ab5a0', '#a07ab5', '#b57a7a', '#7a9ab5']

function unsplashUrl(id: string, w = 1200) {
  return `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`
}

function getHeroId(category: string): string {
  return CATEGORY_HERO[category] ?? CATEGORY_HERO['Holistic Foundations'] ?? 'photo-1571019613454-1cb2f99b2d8b'
}

function formatDuration(min: number): string {
  if (min < 60) return `${min}m`
  return `${Math.floor(min / 60)}h ${min % 60}m`
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

// ── HTML Section Parser ────────────────────────────────────────────────────────

function parseSections(html: string): ContentSection[] {
  const headingRe = /<h([23])(?:[^>]*)>([\s\S]*?)<\/h[23]>/gi
  const headings: { start: number; end: number; level: 2 | 3; title: string }[] = []
  let m: RegExpExecArray | null
  while ((m = headingRe.exec(html)) !== null) {
    headings.push({
      start: m.index, end: m.index + m[0].length,
      level: parseInt(m[1]) as 2 | 3,
      title: m[2].replace(/<[^>]+>/g, '').trim(),
    })
  }
  if (headings.length === 0) return [{ index: 0, level: 2, title: '', html }]
  const sections: ContentSection[] = []
  let idx = 0
  if (headings[0].start > 0) {
    const pre = html.slice(0, headings[0].start).trim()
    if (pre) sections.push({ index: idx++, level: 2, title: '', html: pre })
  }
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i]
    const nextStart = i < headings.length - 1 ? headings[i + 1].start : html.length
    const body = html.slice(h.end, nextStart).trim()
    if (body) sections.push({ index: idx++, level: h.level, title: h.title, html: body })
  }
  return sections
}

// ── Streak Badge ───────────────────────────────────────────────────────────────

function StreakBadge({ streak }: { streak: GamificationState['streak'] }) {
  const display = currentStreakDisplay(streak)
  if (display === 0) return null
  return (
    <div
      className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
      style={{ background: 'rgba(196,160,78,0.12)', color: '#c4a04e', border: '1px solid rgba(196,160,78,0.25)' }}
    >
      <HugeiconsIcon icon={Fire03Icon} size={12} />
      {display} day streak
    </div>
  )
}

// ── Star Counter ───────────────────────────────────────────────────────────────

function StarCounter({ total }: { total: number }) {
  if (total === 0) return null
  return (
    <div
      className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
      style={{ background: 'rgba(196,160,78,0.12)', color: '#c4a04e', border: '1px solid rgba(196,160,78,0.25)' }}
    >
      <HugeiconsIcon icon={HonourStarIcon} size={12} />
      {total}
    </div>
  )
}

// ── Stars Drop-In ──────────────────────────────────────────────────────────────

function StarsDropIn({ count }: { count: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {[1, 2, 3].map(n => (
        <HugeiconsIcon
          key={n}
          icon={HonourStarIcon}
          size={28}
          className="learn-star"
          style={{
            color: n <= count ? '#c4a04e' : 'rgba(196,160,78,0.2)',
            animation: n <= count ? `starDrop 0.5s cubic-bezier(0.34,1.56,0.64,1) both` : undefined,
            animationDelay: `${(n - 1) * 0.18}s`,
          }}
        />
      ))}
    </div>
  )
}

// ── Star Burst ─────────────────────────────────────────────────────────────────

function StarBurst({ active }: { active: boolean }) {
  if (!active) return null
  const COLORS = ['#c4a04e', '#6db57a', '#7ab5a0', '#c4a04e', '#b5a07a', '#a07ab5']
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 10 }}>
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = i * 30
        const rad = (angle * Math.PI) / 180
        const dist = 55 + (i % 3) * 15
        const dx = Math.cos(rad) * dist
        const dy = Math.sin(rad) * dist
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 8 + (i % 3) * 3,
              height: 8 + (i % 3) * 3,
              left: '50%',
              top: '50%',
              background: COLORS[i % COLORS.length],
              '--dx': `${dx}px`,
              '--dy': `${dy}px`,
              animation: 'confettiBurst 1s ease forwards',
              animationDelay: `${i * 0.04}s`,
            } as React.CSSProperties}
          />
        )
      })}
    </div>
  )
}

// ── Module Badge Reveal ────────────────────────────────────────────────────────

function ModuleBadgeReveal({ badge, onDismiss }: { badge: ModuleBadge; onDismiss: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'rgba(0,0,0,0.92)' }}
    >
      <div
        className="learn-badge-medallion mb-6 flex h-32 w-32 items-center justify-center rounded-full"
        style={{
          background: 'linear-gradient(135deg, #a3843b, #c4a04e)',
          boxShadow: '0 0 80px rgba(196,160,78,0.5), 0 0 0 4px rgba(196,160,78,0.25)',
          animation: 'badgeReveal 0.7s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
      >
        <HugeiconsIcon icon={HonourStarIcon} size={56} className="text-white" />
      </div>
      <StarsDropIn count={3} />
      <p className="mt-5 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#9a8870' }}>
        Module Complete
      </p>
      <p className="mt-2 text-[30px] font-bold leading-tight" style={{ color: '#ede5d8' }}>
        {badge.badgeName}
      </p>
      <p className="mt-1 text-[13px]" style={{ color: '#9a8870' }}>
        Badge earned · {badge.moduleName}
      </p>
      <button
        onClick={onDismiss}
        className="mt-8 rounded-2xl px-8 py-3.5 text-[14px] font-semibold text-white transition-all hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #a3843b, #c4a04e)', boxShadow: '0 4px 24px rgba(196,160,78,0.35)' }}
      >
        Continue Learning
      </button>
    </div>
  )
}

// ── Locked Lesson Notice ───────────────────────────────────────────────────────

function LockedLessonNotice({ prevLessonTitle }: { prevLessonTitle: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl py-16 text-center"
      style={{ background: 'rgba(20,16,11,0.7)', border: '1px solid rgba(196,160,78,0.15)' }}
    >
      <div
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: 'rgba(196,160,78,0.08)', border: '2px solid rgba(196,160,78,0.2)' }}
      >
        <HugeiconsIcon icon={LockIcon} size={28} style={{ color: 'rgba(196,160,78,0.5)' }} />
      </div>
      <h2 className="mb-2 text-[20px] font-bold" style={{ color: '#ede5d8' }}>Lesson Locked</h2>
      <p className="max-w-xs text-[13px] leading-relaxed" style={{ color: '#9a8870' }}>
        Complete <span style={{ color: '#c4a04e', fontWeight: 600 }}>"{prevLessonTitle}"</span> to unlock this lesson.
      </p>
    </div>
  )
}

// ── Narration Player ───────────────────────────────────────────────────────────

function NarrationPlayer({ segments, onSegmentChange, onComplete, lessonId }: {
  segments: ContentSection[]
  onSegmentChange: (i: number | null) => void
  onComplete: () => void
  lessonId: string
}) {
  const [state, setState] = useState<'idle' | 'playing' | 'paused'>('idle')
  const cancelRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const currentSegRef = useRef(0)
  const resumeFromRef = useRef(0)

  // Reset when lesson changes
  useEffect(() => {
    cancelRef.current = true
    abortRef.current?.abort()
    stopSpeech()
    setState('idle')
    onSegmentChange(null)
    currentSegRef.current = 0
    resumeFromRef.current = 0
  }, [lessonId]) // eslint-disable-line

  useEffect(() => {
    return () => {
      cancelRef.current = true
      abortRef.current?.abort()
      stopSpeech()
    }
  }, [])

  const runNarration = useCallback(async (fromIndex: number) => {
    cancelRef.current = false
    abortRef.current = new AbortController()
    setState('playing')

    for (let i = fromIndex; i < segments.length; i++) {
      if (cancelRef.current) break
      currentSegRef.current = i
      onSegmentChange(i)

      const text = stripHtml(segments[i].html)
      if (text.trim()) {
        await new Promise<void>(resolve => {
          void speakText(text, {
            modelId: 'nova',
            signal: abortRef.current?.signal,
            onEnd: resolve,
            onError: resolve,
          })
        })
      }

      if (cancelRef.current) break
      await new Promise<void>(r => setTimeout(r, 400))
    }

    if (!cancelRef.current) {
      onSegmentChange(null)
      onComplete()
    }
    setState('idle')
  }, [segments, onSegmentChange, onComplete])

  const handleToggle = () => {
    if (state === 'playing') {
      cancelRef.current = true
      abortRef.current?.abort()
      stopSpeech()
      resumeFromRef.current = currentSegRef.current
      onSegmentChange(null)
      setState('paused')
      return
    }
    if (state === 'paused') {
      abortRef.current = new AbortController()
      void runNarration(resumeFromRef.current)
      return
    }
    currentSegRef.current = 0
    resumeFromRef.current = 0
    void runNarration(0)
  }

  if (segments.length === 0) return null

  const icon = state === 'playing' ? PauseIcon : PlayIcon
  const label = state === 'playing' ? 'Pause' : state === 'paused' ? 'Resume' : 'Narrate'

  return (
    <button
      onClick={handleToggle}
      className="flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-semibold transition-all"
      style={{
        background: state === 'playing' ? 'rgba(196,160,78,0.18)' : 'rgba(196,160,78,0.1)',
        color: '#c4a04e',
        border: '1px solid rgba(196,160,78,0.3)',
      }}
    >
      <HugeiconsIcon icon={icon} size={14} />
      <HugeiconsIcon icon={Mic01Icon} size={12} />
      {label}
    </button>
  )
}

// ── Quiz: Progress Dots ────────────────────────────────────────────────────────

function QuizProgressDots({ total, currentIndex, results }: {
  total: number
  currentIndex: number
  results: (boolean | null)[]
}) {
  return (
    <div className="flex items-center justify-center gap-2 mb-5">
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i === currentIndex
        const res = results[i]
        return (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: isActive ? 22 : 10,
              height: 10,
              background: res === true ? '#6db57a' : res === false ? 'rgba(181,122,122,0.6)' : isActive ? '#c4a04e' : 'rgba(196,160,78,0.2)',
              animation: isActive ? 'dotPop 0.3s ease' : undefined,
            }}
          />
        )
      })}
    </div>
  )
}

// ── Quiz: Timer ────────────────────────────────────────────────────────────────

function QuizTimer({ timeLeft, hidden }: { timeLeft: number; hidden?: boolean }) {
  if (hidden) return null
  const pct = (timeLeft / QUIZ_TIME_PER_Q) * 100
  const urgent = timeLeft <= 5
  return (
    <div className="mb-4 flex items-center gap-2">
      <span
        className="w-6 text-right text-[12px] font-mono tabular-nums font-bold"
        style={{
          color: urgent ? '#c87a7a' : '#9a8870',
          animation: urgent ? 'timerUrgent 0.6s ease infinite' : undefined,
        }}
      >
        {timeLeft}
      </span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(196,160,78,0.1)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: urgent ? 'linear-gradient(90deg, #b57a7a, #c87a7a)' : 'linear-gradient(90deg, #a3843b, #c4a04e)',
            transition: 'width 1s linear',
          }}
        />
      </div>
    </div>
  )
}

// ── Quiz: Question Card ────────────────────────────────────────────────────────

function QuizQuestionCard({
  question, selected, phase, onSelect,
}: {
  question: QuizQuestion
  selected: string | null
  phase: QuizPhase
  onSelect: (answer: string) => void
}) {
  const [shortInput, setShortInput] = useState('')
  const answered = phase === 'answered' || phase === 'complete'

  const getOptionStyle = (opt: string): React.CSSProperties => {
    const isSelected = selected === opt
    const isCorrect = answered && opt.toLowerCase().trim() === (question.correct_answer ?? '').toLowerCase().trim()
    const isWrong = answered && isSelected && !isCorrect
    return {
      borderColor: isCorrect ? '#6db57a' : isWrong ? '#b57a7a' : isSelected ? '#c4a04e' : 'rgba(196,160,78,0.18)',
      background: isCorrect ? 'rgba(109,181,122,0.12)' : isWrong ? 'rgba(181,122,122,0.12)' : isSelected ? 'rgba(196,160,78,0.1)' : 'rgba(20,16,11,0.6)',
      color: isCorrect ? '#6db57a' : isWrong ? '#c87a7a' : isSelected ? '#c4a04e' : '#ede5d8',
      animation: isCorrect && answered ? 'quizPulse 0.4s ease' : isWrong && answered ? 'quizShake 0.4s ease' : undefined,
      cursor: answered ? 'default' : 'pointer',
    }
  }

  const options = question.type === 'true_false' ? ['True', 'False'] : (question.options ?? [])

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border p-6"
      style={{
        borderColor: 'rgba(196,160,78,0.2)',
        background: 'rgba(14,12,9,0.95)',
        animation: 'quizSlideIn 0.4s cubic-bezier(0.22,1,0.36,1) both',
      }}
    >
      <p className="text-[16px] font-semibold leading-relaxed" style={{ color: '#ede5d8' }}>
        {question.question}
      </p>

      {question.type !== 'short_answer' ? (
        <div className="flex flex-col gap-2.5">
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={() => !answered && onSelect(opt)}
              className="rounded-xl border px-5 py-3.5 text-left text-[14px] font-medium transition-all"
              style={getOptionStyle(opt)}
            >
              <span className="text-[11px] font-bold mr-3" style={{ opacity: 0.5 }}>
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            value={shortInput}
            onChange={e => setShortInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && shortInput.trim() && !answered) { onSelect(shortInput.trim()); setShortInput('') } }}
            disabled={answered}
            placeholder="Type your answer and press Enter…"
            className="flex-1 rounded-xl border px-4 py-3 text-[13px] outline-none"
            style={{
              borderColor: 'rgba(196,160,78,0.25)',
              background: 'rgba(196,160,78,0.05)',
              color: '#ede5d8',
            }}
          />
          {!answered && (
            <button
              onClick={() => { if (shortInput.trim()) { onSelect(shortInput.trim()); setShortInput('') } }}
              className="rounded-xl px-4 py-3 text-[13px] font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #a3843b, #c4a04e)' }}
            >
              Submit
            </button>
          )}
        </div>
      )}

      {answered && question.explanation && (
        <div
          className="rounded-xl px-4 py-3 text-[12px] leading-relaxed"
          style={{
            background: 'rgba(122,160,181,0.08)',
            color: '#8bb5c8',
            borderLeft: '3px solid rgba(122,160,181,0.4)',
          }}
        >
          {question.explanation}
        </div>
      )}
    </div>
  )
}

// ── Quiz: Result Screen ────────────────────────────────────────────────────────

function QuizResultScreen({
  displayPct, correctCount, total, stars, passed, onContinue, onRetry,
}: {
  displayPct: number
  correctCount: number
  total: number
  stars: 1 | 2 | 3
  passed: boolean
  onContinue: () => void
  onRetry: () => void
}) {
  return (
    <div
      className="relative flex flex-col items-center rounded-2xl border px-8 py-10 text-center"
      style={{ borderColor: 'rgba(196,160,78,0.2)', background: 'rgba(14,12,9,0.95)', overflow: 'hidden' }}
    >
      <StarBurst active={passed} />

      <p className="mb-2 text-[12px] font-bold uppercase tracking-widest" style={{ color: '#9a8870' }}>
        Quiz Complete
      </p>

      <p
        className="mb-1 text-[64px] font-bold leading-none tabular-nums"
        style={{ color: passed ? '#c4a04e' : '#c87a7a', animation: 'scoreCountUp 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}
      >
        {displayPct}%
      </p>
      <p className="mb-5 text-[13px]" style={{ color: '#9a8870' }}>
        {correctCount} of {total} correct
      </p>

      <StarsDropIn count={passed ? stars : 1} />

      <p className="mt-4 text-[13px]" style={{ color: passed ? '#6db57a' : '#c87a7a' }}>
        {passed
          ? displayPct === 100 ? '✨ Perfect score — exceptional!' : '🌿 Well done — lesson unlocked!'
          : `Need ${PASS_THRESHOLD}% to pass. You're at ${displayPct}% — almost there.`}
      </p>

      <div className="mt-6 flex gap-3">
        <button
          onClick={onRetry}
          className="rounded-xl border px-5 py-2.5 text-[13px] font-semibold transition-all hover:opacity-80"
          style={{ borderColor: 'rgba(196,160,78,0.3)', color: '#9a8870' }}
        >
          Try Again
        </button>
        {passed && (
          <button
            onClick={onContinue}
            className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-[13px] font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #a3843b, #c4a04e)', boxShadow: '0 4px 20px rgba(196,160,78,0.3)' }}
          >
            Lesson Complete
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Elevate Quiz ───────────────────────────────────────────────────────────────

function ElevateQuiz({ questions, onPass }: {
  questions: QuizQuestion[]
  onPass: (scorePct: number, stars: 1|2|3, elapsedMs: number) => void
}) {
  const [phase, setPhase] = useState<QuizPhase>('question')
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [results, setResults] = useState<(boolean | null)[]>(() => Array(questions.length).fill(null))
  const [timeLeft, setTimeLeft] = useState(QUIZ_TIME_PER_Q)
  const [displayPct, setDisplayPct] = useState(0)
  const startMsRef = useRef(performance.now())
  const phaseRef = useRef<QuizPhase>('question')
  const processAnswerRef = useRef<(a: string | null) => void>(() => {})
  const advanceRef = useRef<() => void>(() => {})

  useEffect(() => { phaseRef.current = phase }, [phase])

  const q = questions[idx]
  const isShortAnswer = q?.type === 'short_answer'
  const finalPct = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0
  const totalTimeMs = questions.length * QUIZ_TIME_PER_Q * 1000

  // Sync processAnswer
  useEffect(() => {
    processAnswerRef.current = (answer: string | null) => {
      if (phaseRef.current !== 'question') return
      const question = questions[idx]
      const right = answer !== null &&
        answer.toLowerCase().trim() === (question?.correct_answer ?? '').toLowerCase().trim()
      setSelected(answer)
      if (right) setCorrectCount(c => c + 1)
      setResults(r => { const n = [...r]; n[idx] = right; return n })
      setPhase('answered')
    }
  }, [idx, questions])

  // Sync advance
  useEffect(() => {
    advanceRef.current = () => {
      const next = idx + 1
      if (next < questions.length) {
        setIdx(next); setSelected(null); setPhase('question')
      } else {
        setPhase('complete')
      }
    }
  }, [idx, questions.length])

  // Timer display
  useEffect(() => {
    if (phase !== 'question' || isShortAnswer) return
    setTimeLeft(QUIZ_TIME_PER_Q)
    const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [phase, idx, isShortAnswer])

  // Timer auto-fail (separate from display for reliability)
  useEffect(() => {
    if (phase !== 'question' || isShortAnswer) return
    const id = setTimeout(() => processAnswerRef.current(null), QUIZ_TIME_PER_Q * 1000)
    return () => clearTimeout(id)
  }, [phase, idx, isShortAnswer])

  // Auto-advance after answering
  useEffect(() => {
    if (phase !== 'answered') return
    const id = setTimeout(() => advanceRef.current(), 2200)
    return () => clearTimeout(id)
  }, [phase, idx])

  // Score reveal animation on complete
  useEffect(() => {
    if (phase !== 'complete') return
    let current = 0
    const target = finalPct
    const step = () => {
      current = Math.min(current + 3, target)
      setDisplayPct(current)
      if (current < target) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [phase]) // eslint-disable-line

  const handleRetry = () => {
    setPhase('question')
    setIdx(0)
    setSelected(null)
    setCorrectCount(0)
    setResults(Array(questions.length).fill(null))
    setTimeLeft(QUIZ_TIME_PER_Q)
    setDisplayPct(0)
    startMsRef.current = performance.now()
  }

  const stars = starsForLesson('quiz', finalPct, performance.now() - startMsRef.current, totalTimeMs)

  if (phase === 'complete') {
    return (
      <QuizResultScreen
        displayPct={displayPct}
        correctCount={correctCount}
        total={questions.length}
        stars={stars}
        passed={finalPct >= PASS_THRESHOLD}
        onContinue={() => onPass(finalPct, stars, performance.now() - startMsRef.current)}
        onRetry={handleRetry}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <QuizProgressDots total={questions.length} currentIndex={idx} results={results} />
      <QuizTimer timeLeft={timeLeft} hidden={isShortAnswer} />
      {q && (
        <QuizQuestionCard
          key={`${idx}-${phase}`}
          question={q}
          selected={selected}
          phase={phase}
          onSelect={a => processAnswerRef.current(a)}
        />
      )}
      {phase === 'answered' && (
        <button
          onClick={() => advanceRef.current()}
          className="flex items-center justify-center gap-2 rounded-2xl py-3 text-[13px] font-semibold transition-all hover:opacity-90"
          style={{
            background: idx < questions.length - 1 ? 'rgba(196,160,78,0.1)' : 'linear-gradient(135deg, #a3843b, #c4a04e)',
            color: idx < questions.length - 1 ? '#c4a04e' : 'white',
            border: idx < questions.length - 1 ? '1px solid rgba(196,160,78,0.3)' : 'none',
          }}
        >
          {idx < questions.length - 1 ? 'Next Question' : 'See Results'}
          <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
        </button>
      )}
    </div>
  )
}

// ── Section Block ──────────────────────────────────────────────────────────────

function SectionBlock({
  section, delay, accentColor, imageUrl, isNarrating,
}: {
  section: ContentSection
  delay: number
  accentColor: string
  imageUrl?: string
  isNarrating?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  useEffect(() => {
    if (isNarrating && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [isNarrating])

  return (
    <div
      ref={ref}
      className={`transition-all duration-700${isNarrating ? ' learn-narrating' : ''}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
      }}
    >
      {section.title && (
        <div className="mb-4 flex items-center gap-3">
          <div className="h-4 w-1 rounded-full" style={{ background: accentColor }} />
          <h2
            className="text-[18px] font-bold"
            style={{
              color: section.level === 2 ? '#ede5d8' : '#c4a04e',
              fontSize: section.level === 2 ? '18px' : '15px',
              letterSpacing: section.level === 3 ? '0.04em' : undefined,
              textTransform: section.level === 3 ? 'uppercase' : undefined,
            }}
          >
            {section.title}
          </h2>
        </div>
      )}

      {imageUrl && (
        <div className="mb-5 overflow-hidden rounded-2xl" style={{ height: '200px' }}>
          <img
            src={imageUrl} alt=""
            className="h-full w-full object-cover"
            style={{ filter: 'brightness(0.85)' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>
      )}

      <div className="learn-prose" dangerouslySetInnerHTML={{ __html: section.html }} />
    </div>
  )
}

// ── Enrollment Form ────────────────────────────────────────────────────────────

function EnrollmentForm({ onEnroll }: { onEnroll: (name: string, email: string) => Promise<void> }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    setLoading(true); setError('')
    try { await onEnroll(name.trim(), email.trim()) }
    catch { setError('Enrollment failed. Please try again.') }
    finally { setLoading(false) }
  }

  const inputCls = 'w-full rounded-xl border px-4 py-3 text-[14px] outline-none transition-all'
  const inputStyle = { borderColor: 'rgba(196,160,78,0.25)', background: 'rgba(196,160,78,0.05)', color: '#ede5d8' }

  return (
    <div className="rounded-2xl p-6" style={{ background: 'rgba(196,160,78,0.06)', border: '1px solid rgba(196,160,78,0.2)' }}>
      <h3 className="mb-1 text-[16px] font-bold" style={{ color: '#ede5d8' }}>Enroll to access all lessons</h3>
      <p className="mb-5 text-[13px]" style={{ color: '#9a8870' }}>Free enrollment — begin your journey today.</p>
      {error && (
        <p className="mb-3 rounded-xl px-3 py-2 text-[12px]" style={{ background: 'rgba(181,122,122,0.12)', color: '#c87a7a' }}>{error}</p>
      )}
      <form onSubmit={e => void handleSubmit(e)} className="flex flex-col gap-3">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className={inputCls} style={inputStyle} />
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email (optional)" className={inputCls} style={inputStyle} />
        <button
          type="submit" disabled={loading}
          className="rounded-xl py-3 text-[14px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #a3843b, #c4a04e)', boxShadow: '0 4px 20px rgba(196,160,78,0.25)' }}
        >
          {loading ? 'Enrolling…' : 'Enroll Free'}
        </button>
      </form>
    </div>
  )
}

// ── Lesson Player ──────────────────────────────────────────────────────────────

function LessonPlayer({
  lesson, module, lessonIndex, totalLessons,
  isEnrolled, isCompleted,
  onComplete, onNext, onPrev, hasPrev, hasNext,
}: {
  lesson: Lesson
  module: TrainingModule
  lessonIndex: number
  totalLessons: number
  isEnrolled: boolean
  isCompleted: boolean
  onComplete: (opts?: { quizScore?: number; elapsedMs?: number; stars?: 1|2|3 }) => void
  onNext: () => void
  onPrev: () => void
  hasPrev: boolean
  hasNext: boolean
}) {
  const [sections, setSections] = useState<ContentSection[]>([])
  const [narratingIndex, setNarratingIndex] = useState<number | null>(null)
  const [showBurst, setShowBurst] = useState(false)
  const [showStars, setShowStars] = useState(false)
  const heroId = getHeroId(module.category)
  const accent = SECTION_ACCENT[lessonIndex % SECTION_ACCENT.length]

  useEffect(() => {
    if (lesson.type === 'text' && lesson.content_html) {
      setSections(parseSections(lesson.content_html))
    } else {
      setSections([])
    }
    setNarratingIndex(null)
    setShowBurst(false)
    setShowStars(false)
  }, [lesson.id, lesson.type, lesson.content_html])

  const handleComplete = () => {
    setShowBurst(true)
    setShowStars(true)
    setTimeout(() => { setShowBurst(false); setShowStars(false) }, 2200)
    onComplete()
  }

  const midImageIdx = Math.floor(sections.length / 2)

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl" style={{ minHeight: '220px' }}>
        <img
          src={unsplashUrl(heroId, 1200)} alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: 'brightness(0.35)' }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(14,12,9,0.6) 0%, rgba(10,8,6,0.85) 100%)' }} />
        <div className="relative z-10 p-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest"
              style={{ background: 'rgba(196,160,78,0.15)', color: '#c4a04e', border: '1px solid rgba(196,160,78,0.3)' }}>
              {module.category}
            </span>
            <span className="text-[11px]" style={{ color: 'rgba(237,229,216,0.5)' }}>
              Lesson {lessonIndex + 1} of {totalLessons}
            </span>
            {lesson.duration_minutes != null && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(237,229,216,0.5)' }}>
                <HugeiconsIcon icon={Clock01Icon} size={10} />
                {lesson.duration_minutes}m
              </span>
            )}
          </div>
          <h1 className="text-[26px] font-bold leading-tight" style={{ color: '#ede5d8' }}>{lesson.title}</h1>
          <div className="mt-3 flex items-center gap-2">
            <HugeiconsIcon icon={LESSON_ICONS[lesson.type]} size={14} style={{ color: accent }} />
            <span className="capitalize text-[12px] font-medium" style={{ color: accent }}>{lesson.type}</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'rgba(196,160,78,0.15)' }}>
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${((lessonIndex + (isCompleted ? 1 : 0)) / totalLessons) * 100}%`,
              background: 'linear-gradient(90deg, #a3843b, #c4a04e)',
            }}
          />
        </div>
      </div>

      {/* Action bar */}
      <div
        className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl p-4"
        style={{ background: 'rgba(20,16,11,0.7)', border: '1px solid rgba(196,160,78,0.12)' }}
      >
        {lesson.type === 'text' && sections.length > 0 && (
          <NarrationPlayer
            key={lesson.id}
            lessonId={lesson.id}
            segments={sections}
            onSegmentChange={setNarratingIndex}
            onComplete={() => { /* narration complete — no action needed */ }}
          />
        )}

        <div className="ml-auto flex items-center gap-2">
          {hasPrev && (
            <button onClick={onPrev}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-medium transition-all"
              style={{ color: '#9a8870', border: '1px solid rgba(196,160,78,0.15)' }}>
              <HugeiconsIcon icon={ArrowLeft01Icon} size={12} />
              Prev
            </button>
          )}
          {lesson.type !== 'quiz' && isEnrolled && !isCompleted && (
            <div className="relative">
              <StarBurst active={showBurst} />
              <button
                onClick={handleComplete}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-semibold text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #a3843b, #c4a04e)', boxShadow: '0 3px 12px rgba(196,160,78,0.3)' }}
              >
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} />
                Mark Complete
              </button>
            </div>
          )}
          {lesson.type !== 'quiz' && isCompleted && (
            <span className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: '#6db57a' }}>
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} />
              Completed
            </span>
          )}
          {hasNext && lesson.type !== 'quiz' && (
            <button onClick={onNext}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-medium transition-all"
              style={{ color: '#c4a04e', border: '1px solid rgba(196,160,78,0.3)', background: 'rgba(196,160,78,0.06)' }}>
              Next
              <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Stars on complete (non-quiz) */}
      {showStars && lesson.type !== 'quiz' && (
        <div
          className="mt-4 flex flex-col items-center gap-3 rounded-2xl p-5"
          style={{ background: 'rgba(109,181,122,0.08)', border: '1px solid rgba(109,181,122,0.2)' }}
        >
          <p className="text-[13px] font-semibold" style={{ color: '#6db57a' }}>🌿 Lesson complete — well done!</p>
          <StarsDropIn count={1} />
        </div>
      )}

      {/* Main content */}
      <div className="mt-6 flex flex-col gap-7">
        {lesson.type === 'text' && sections.map((sec, i) => (
          <div key={sec.index}>
            <SectionBlock
              section={sec}
              delay={i * 120}
              accentColor={SECTION_ACCENT[i % SECTION_ACCENT.length]}
              isNarrating={i === narratingIndex}
              imageUrl={i === midImageIdx && i > 0 ? unsplashUrl(heroId, 800) : lesson.image_urls?.[i - 1]}
            />
            {i < sections.length - 1 && (
              <div className="mt-7 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(196,160,78,0.15), transparent)' }} />
            )}
          </div>
        ))}

        {lesson.type === 'video' && (
          lesson.video_url ? (
            <div className="overflow-hidden rounded-2xl" style={{ paddingBottom: '56.25%', position: 'relative', height: 0 }}>
              <iframe
                src={lesson.video_url} title={lesson.title} frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen className="absolute inset-0 h-full w-full rounded-2xl"
              />
            </div>
          ) : <p className="text-center text-[14px]" style={{ color: '#9a8870' }}>No video URL provided.</p>
        )}

        {lesson.type === 'audio' && (
          lesson.audio_url ? (
            <div className="rounded-2xl p-6" style={{ background: 'rgba(196,160,78,0.06)', border: '1px solid rgba(196,160,78,0.15)' }}>
              <p className="mb-3 text-[12px] font-medium uppercase tracking-widest" style={{ color: '#c4a04e' }}>Audio Lesson</p>
              <audio controls className="w-full" src={lesson.audio_url}>Your browser does not support audio.</audio>
            </div>
          ) : <p className="text-center text-[14px]" style={{ color: '#9a8870' }}>No audio URL provided.</p>
        )}

        {lesson.type === 'pdf' && (
          lesson.pdf_url ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(196,160,78,0.06)', border: '1px solid rgba(196,160,78,0.15)' }}>
              <HugeiconsIcon icon={File01Icon} size={40} className="mx-auto mb-4" style={{ color: '#c4a04e' }} />
              <a href={lesson.pdf_url} target="_blank" rel="noopener noreferrer"
                className="text-[14px] font-medium underline" style={{ color: '#c4a04e' }}>
                Open PDF Document
              </a>
            </div>
          ) : <p className="text-center text-[14px]" style={{ color: '#9a8870' }}>No PDF URL provided.</p>
        )}

        {lesson.type === 'quiz' && (
          lesson.quiz_questions && lesson.quiz_questions.length > 0 && !isCompleted ? (
            <ElevateQuiz
              key={lesson.id}
              questions={lesson.quiz_questions}
              onPass={(scorePct, stars, elapsedMs) => onComplete({ quizScore: scorePct, stars, elapsedMs })}
            />
          ) : isCompleted ? (
            <div className="flex flex-col items-center rounded-2xl p-10 text-center"
              style={{ background: 'rgba(109,181,122,0.08)', border: '1px solid rgba(109,181,122,0.2)' }}>
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={40} className="mb-4" style={{ color: '#6db57a' }} />
              <p className="text-[16px] font-bold" style={{ color: '#6db57a' }}>Quiz Passed</p>
              <p className="mt-1 text-[13px]" style={{ color: '#9a8870' }}>You've already completed this quiz.</p>
            </div>
          ) : (
            <p className="text-center text-[14px]" style={{ color: '#9a8870' }}>No quiz questions yet.</p>
          )
        )}

        {lesson.image_urls && lesson.image_urls.length > 0 && lesson.type !== 'text' && (
          <div className="flex flex-col gap-4">
            {lesson.image_urls.map((url, i) => (
              <img key={i} src={url} alt="" className="w-full rounded-2xl object-cover" style={{ maxHeight: '320px' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Learn Screen ──────────────────────────────────────────────────────────

export function LearnScreen() {
  const params = useParams({ from: '/learn/$slug' })
  const slug = params.slug
  const brand = 'hfm'

  const [module, setModule] = useState<TrainingModule | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [gamification, setGamification] = useState<GamificationState>(() => loadGamification())
  const [badgeToReveal, setBadgeToReveal] = useState<ModuleBadge | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/training/public/${slug}?brand=${brand}`)
        if (!res.ok) { setNotFound(true); return }
        const data = await res.json() as { module?: TrainingModule }
        if (data.module) {
          setModule(data.module)
          const sorted = [...data.module.lessons].sort((a, b) => a.order - b.order)
          if (sorted.length > 0) setActiveLesson(sorted[0])
        } else {
          setNotFound(true)
        }
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    })()
  }, [slug])

  useEffect(() => {
    if (!module) return
    const stored = localStorage.getItem(ENROLLMENT_KEY(module.id))
    if (stored) {
      try {
        const e = JSON.parse(stored) as Enrollment
        setEnrollment(e)
        setCompletedIds(new Set(e.completed_lessons))
      } catch { /* ignore */ }
    }
  }, [module])

  const handleEnroll = async (name: string, email: string) => {
    if (!module) return
    const res = await fetch('/api/training/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module_id: module.id, contact_name: name, contact_email: email, brand }),
    })
    if (!res.ok) throw new Error('Enrollment failed')
    const data = await res.json() as { enrollment?: Enrollment }
    if (data.enrollment) {
      setEnrollment(data.enrollment)
      localStorage.setItem(ENROLLMENT_KEY(module.id), JSON.stringify(data.enrollment))
    }
  }

  const markComplete = async (
    lessonId: string,
    opts?: { quizScore?: number; elapsedMs?: number; stars?: 1|2|3 },
  ) => {
    if (!enrollment || !module) return

    const newCompletedIds = new Set(completedIds)
    newCompletedIds.add(lessonId)
    setCompletedIds(newCompletedIds)

    // Advance to next unlocked lesson
    const sorted = [...module.lessons].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex(l => l.id === lessonId)
    if (idx < sorted.length - 1) setActiveLesson(sorted[idx + 1])

    // Gamification
    const lesson = module.lessons.find(l => l.id === lessonId)
    if (lesson) {
      let g = { ...gamification }

      if (opts?.quizScore !== undefined) {
        g = recordQuizScore(g, lessonId, opts.quizScore)
      }

      const totalTimeMs = (lesson.quiz_questions?.length ?? 1) * QUIZ_TIME_PER_Q * 1000
      g = recordLessonStars(g, lessonId, lesson.type, opts?.quizScore, opts?.elapsedMs, totalTimeMs)
      g = { ...g, streak: recordStudyDay(g.streak) }

      const updatedScores = opts?.quizScore !== undefined
        ? { ...g.quizScores, [lessonId]: Math.max(g.quizScores[lessonId] ?? 0, opts.quizScore) }
        : g.quizScores

      const { gami: newG, awarded } = maybeAwardBadge(module, newCompletedIds, updatedScores, g)
      saveGamification(newG)
      setGamification(newG)
      if (awarded) setBadgeToReveal(awarded)
    }

    // Backend sync
    try {
      const res = await fetch('/api/training/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollment_id: enrollment.id, completed_lesson_id: lessonId, brand }),
      })
      if (res.ok) {
        const data = await res.json() as { enrollment?: Enrollment }
        if (data.enrollment) {
          setEnrollment(data.enrollment)
          localStorage.setItem(ENROLLMENT_KEY(module.id), JSON.stringify(data.enrollment))
        }
      }
    } catch { /* non-critical */ }
  }

  if (loading) {
    return (
      <div className="learn-root flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-[3px]"
            style={{ borderColor: 'rgba(196,160,78,0.2)', borderTopColor: '#c4a04e' }} />
          <p className="text-[14px]" style={{ color: '#9a8870' }}>Loading course…</p>
        </div>
        <LearnStyles />
      </div>
    )
  }

  if (notFound || !module) {
    return (
      <div className="learn-root flex min-h-screen items-center justify-center">
        <div className="text-center">
          <HugeiconsIcon icon={SchoolIcon} size={52} className="mx-auto mb-5" style={{ color: 'rgba(196,160,78,0.3)' }} />
          <h1 className="text-[22px] font-bold" style={{ color: '#ede5d8' }}>Course Not Found</h1>
          <p className="mt-2 text-[14px]" style={{ color: '#9a8870' }}>This course may have been removed or is not yet published.</p>
        </div>
        <LearnStyles />
      </div>
    )
  }

  const sortedLessons = [...module.lessons].sort((a, b) => a.order - b.order)
  const isEnrolled = !!enrollment
  const progress = enrollment?.progress ?? 0
  const quizScores = gamification.quizScores
  const activeLessonIdx = activeLesson ? sortedLessons.findIndex(l => l.id === activeLesson.id) : 0

  // Module-level lock: check if the preceding module has been completed via badge
  const moduleOrderIdx = MODULE_ORDER.indexOf(module.title)
  const prevModuleName = moduleOrderIdx > 0 ? MODULE_ORDER[moduleOrderIdx - 1] : null
  const moduleIsLocked = prevModuleName !== null &&
    !gamification.badges.some(b => b.moduleName === prevModuleName)

  const getAccess = (_lesson: Lesson, idx: number): LessonAccess => {
    if (moduleIsLocked) return 'locked'
    return lessonAccessState(idx, sortedLessons, completedIds, quizScores, isEnrolled)
  }

  const activeLessonAccess = activeLesson ? getAccess(activeLesson, activeLessonIdx) : 'locked'
  const streakDisplay = currentStreakDisplay(gamification.streak)
  const totalStarsCount = totalStars(gamification)

  return (
    <div className="learn-root min-h-screen">
      <LearnStyles />

      {badgeToReveal && (
        <ModuleBadgeReveal badge={badgeToReveal} onDismiss={() => setBadgeToReveal(null)} />
      )}

      {/* Top navigation bar */}
      <header
        className="sticky top-0 z-30 border-b px-6 py-3"
        style={{ background: 'rgba(10,8,6,0.97)', backdropFilter: 'blur(16px)', borderColor: 'rgba(196,160,78,0.12)' }}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-lg lg:hidden"
            style={{ background: 'rgba(196,160,78,0.1)', color: '#c4a04e' }}
          >
            <HugeiconsIcon icon={BookOpen01Icon} size={16} />
          </button>

          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ background: 'linear-gradient(135deg, #a3843b, #c4a04e)' }}>
            <HugeiconsIcon icon={SchoolIcon} size={16} className="text-white" />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[14px] font-bold" style={{ color: '#ede5d8' }}>{module.title}</h1>
            <div className="flex items-center gap-3 text-[11px]" style={{ color: '#9a8870' }}>
              <span className="flex items-center gap-1">
                <HugeiconsIcon icon={BookOpen01Icon} size={10} />
                {sortedLessons.length} lessons
              </span>
              <span className="flex items-center gap-1">
                <HugeiconsIcon icon={Clock01Icon} size={10} />
                {formatDuration(module.total_duration_minutes)}
              </span>
              <span className="flex items-center gap-1">
                <HugeiconsIcon icon={UserGroupIcon} size={10} />
                {module.enrolled_count} enrolled
              </span>
            </div>
          </div>

          {/* Gamification chips */}
          <div className="hidden items-center gap-2 sm:flex">
            {streakDisplay > 0 && <StreakBadge streak={gamification.streak} />}
            {totalStarsCount > 0 && <StarCounter total={totalStarsCount} />}
          </div>

          {/* Progress */}
          {isEnrolled && (
            <div className="hidden items-center gap-2 sm:flex">
              <div className="h-1.5 w-28 overflow-hidden rounded-full" style={{ background: 'rgba(196,160,78,0.15)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #a3843b, #c4a04e)' }} />
              </div>
              <span className="text-[11px] font-semibold tabular-nums" style={{ color: '#c4a04e' }}>{progress}%</span>
            </div>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto flex max-w-7xl gap-0 lg:gap-6 px-0 lg:px-6 py-0 lg:py-6">
        {/* Sidebar */}
        <aside
          className={`fixed top-0 left-0 z-40 h-full w-[280px] overflow-y-auto border-r pt-16 transition-transform lg:relative lg:top-auto lg:z-auto lg:h-auto lg:w-[260px] lg:shrink-0 lg:translate-x-0 lg:pt-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          style={{ background: 'rgba(8,6,4,0.99)', borderColor: 'rgba(196,160,78,0.12)' }}
        >
          {module.instructor_name && (
            <div className="m-4 rounded-2xl p-4" style={{ background: 'rgba(196,160,78,0.06)', border: '1px solid rgba(196,160,78,0.12)' }}>
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(196,160,78,0.6)' }}>Instructor</p>
              <p className="text-[13px] font-semibold" style={{ color: '#ede5d8' }}>{module.instructor_name}</p>
              {module.instructor_bio && (
                <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: '#9a8870' }}>{module.instructor_bio}</p>
              )}
            </div>
          )}

          {/* Badge earned display */}
          {gamification.badges.some(b => b.moduleId === module.id) && (
            <div className="mx-4 mb-4 flex items-center gap-3 rounded-xl p-3"
              style={{ background: 'rgba(196,160,78,0.08)', border: '1px solid rgba(196,160,78,0.2)' }}>
              <HugeiconsIcon icon={HonourStarIcon} size={20} style={{ color: '#c4a04e' }} />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(196,160,78,0.6)' }}>Badge Earned</p>
                <p className="text-[12px] font-semibold" style={{ color: '#c4a04e' }}>
                  {gamification.badges.find(b => b.moduleId === module.id)?.badgeName}
                </p>
              </div>
            </div>
          )}

          {module.tags.length > 0 && (
            <div className="mx-4 mb-4 flex flex-wrap gap-1.5">
              {module.tags.map(tag => (
                <span key={tag} className="rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                  style={{ background: 'rgba(196,160,78,0.08)', color: '#9a8870', border: '1px solid rgba(196,160,78,0.12)' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Module lock notice in sidebar */}
          {moduleIsLocked && prevModuleName && (
            <div className="mx-4 mb-4 rounded-xl p-3" style={{ background: 'rgba(181,122,122,0.1)', border: '1px solid rgba(181,122,122,0.2)' }}>
              <div className="flex items-center gap-2 mb-1">
                <HugeiconsIcon icon={LockIcon} size={12} style={{ color: '#c87a7a' }} />
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#c87a7a' }}>Module Locked</p>
              </div>
              <p className="text-[11px]" style={{ color: '#9a8870' }}>
                Complete <span style={{ color: '#c87a7a' }}>"{prevModuleName}"</span> first.
              </p>
            </div>
          )}

          {/* Lesson list */}
          <div className="border-t mx-4 pt-4" style={{ borderColor: 'rgba(196,160,78,0.1)' }}>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(196,160,78,0.6)' }}>
              Course Content
            </p>
            <div className="flex flex-col gap-1">
              {sortedLessons.map((lesson, idx) => {
                const access = getAccess(lesson, idx)
                const isActive = activeLesson?.id === lesson.id
                const lessonStars = gamification.stars[lesson.id]
                return (
                  <button
                    key={lesson.id}
                    onClick={() => { setActiveLesson(lesson); setSidebarOpen(false) }}
                    className="flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-all"
                    style={{
                      background: isActive ? 'rgba(196,160,78,0.1)' : 'transparent',
                      border: isActive ? '1px solid rgba(196,160,78,0.2)' : '1px solid transparent',
                      opacity: access === 'locked' ? 0.45 : 1,
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        background: access === 'completed' ? 'rgba(109,181,122,0.15)' : isActive ? 'rgba(196,160,78,0.15)' : 'rgba(196,160,78,0.06)',
                        color: access === 'completed' ? '#6db57a' : isActive ? '#c4a04e' : '#9a8870',
                      }}
                    >
                      {access === 'completed' ? (
                        <HugeiconsIcon icon={CheckmarkSquare02Icon} size={12} />
                      ) : access === 'locked' ? (
                        <HugeiconsIcon icon={LockIcon} size={11} />
                      ) : (
                        <HugeiconsIcon icon={LESSON_ICONS[lesson.type]} size={11} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium leading-snug"
                        style={{ color: isActive ? '#c4a04e' : access === 'completed' ? '#6db57a' : '#ede5d8' }}>
                        {idx + 1}. {lesson.title}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px]" style={{ color: '#9a8870' }}>
                        <span className="capitalize">{lesson.type}</span>
                        {lesson.duration_minutes != null && <span>· {lesson.duration_minutes}m</span>}
                        {lesson.is_preview && <span style={{ color: '#c4a04e' }}>· Preview</span>}
                        {lessonStars && (
                          <span className="flex items-center gap-0.5 ml-auto" style={{ color: '#c4a04e' }}>
                            {Array.from({ length: lessonStars.stars }).map((_, i) => (
                              <HugeiconsIcon key={i} icon={HonourStarIcon} size={9} />
                            ))}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="h-6" />
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 lg:hidden"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content area */}
        <main className="min-w-0 flex-1 px-4 py-4 lg:px-0 lg:py-0">
          {moduleIsLocked && prevModuleName ? (
            <div className="flex flex-col items-center justify-center rounded-2xl py-20 text-center"
              style={{ background: 'rgba(20,16,11,0.7)', border: '1px solid rgba(196,160,78,0.15)' }}>
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full"
                style={{ background: 'rgba(196,160,78,0.08)', border: '2px solid rgba(196,160,78,0.2)' }}>
                <HugeiconsIcon icon={LockIcon} size={36} style={{ color: 'rgba(196,160,78,0.4)' }} />
              </div>
              <h2 className="mb-2 text-[24px] font-bold" style={{ color: '#ede5d8' }}>Module Locked</h2>
              <p className="max-w-sm text-[14px] leading-relaxed" style={{ color: '#9a8870' }}>
                Complete <span style={{ color: '#c4a04e', fontWeight: 600 }}>"{prevModuleName}"</span> and earn its badge to unlock this module.
              </p>
            </div>
          ) : activeLesson ? (
            activeLessonAccess === 'locked' ? (
              <LockedLessonNotice
                prevLessonTitle={sortedLessons[activeLessonIdx - 1]?.title ?? 'the previous lesson'}
              />
            ) : (
              <LessonPlayer
                key={activeLesson.id}
                lesson={activeLesson}
                module={module}
                lessonIndex={activeLessonIdx}
                totalLessons={sortedLessons.length}
                isEnrolled={isEnrolled}
                isCompleted={completedIds.has(activeLesson.id)}
                onComplete={opts => void markComplete(activeLesson.id, opts)}
                onNext={() => {
                  const next = sortedLessons[activeLessonIdx + 1]
                  if (next) setActiveLesson(next)
                }}
                onPrev={() => {
                  const prev = sortedLessons[activeLessonIdx - 1]
                  if (prev) setActiveLesson(prev)
                }}
                hasPrev={activeLessonIdx > 0}
                hasNext={activeLessonIdx < sortedLessons.length - 1}
              />
            )
          ) : (
            <div className="rounded-2xl p-8" style={{ background: 'rgba(20,16,11,0.7)', border: '1px solid rgba(196,160,78,0.15)' }}>
              <span className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide"
                style={{ background: 'rgba(196,160,78,0.1)', color: '#c4a04e', border: '1px solid rgba(196,160,78,0.2)' }}>
                {module.category}
              </span>
              <h2 className="mt-4 mb-3 text-[26px] font-bold" style={{ color: '#ede5d8' }}>{module.title}</h2>
              <p className="mb-6 text-[15px] leading-relaxed" style={{ color: '#9a8870' }}>{module.description}</p>
              {!isEnrolled && <EnrollmentForm onEnroll={handleEnroll} />}
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="mt-12 border-t py-6 px-6 text-center text-[12px]"
        style={{ borderColor: 'rgba(196,160,78,0.1)', color: 'rgba(154,136,112,0.5)' }}>
        © {new Date().getFullYear()} HFM Intelligence · All rights reserved
      </footer>
    </div>
  )
}

// ── Injected Styles ────────────────────────────────────────────────────────────

function LearnStyles() {
  return (
    <style>{`
      html, body { background-color: #0e0c09 !important; }
      .learn-root {
        background-color: #0e0c09;
        color: #ede5d8;
        font-family: inherit;
        min-height: 100vh;
      }
      .learn-root * { box-sizing: border-box; }
      .learn-prose p { color: #c8baa8; line-height: 1.75; margin-bottom: 1rem; font-size: 15px; }
      .learn-prose ul, .learn-prose ol { margin: 1rem 0; padding-left: 1.5rem; color: #c8baa8; }
      .learn-prose li { margin-bottom: 0.5rem; line-height: 1.7; font-size: 15px; }
      .learn-prose li::marker { color: #c4a04e; }
      .learn-prose strong { font-weight: 600; color: #e8d9c0; }
      .learn-prose em { color: #b8aa90; font-style: italic; }
      .learn-prose blockquote {
        border-left: 3px solid rgba(196,160,78,0.5);
        margin: 1.5rem 0; padding: 1rem 1.25rem;
        border-radius: 0 12px 12px 0;
        background: rgba(196,160,78,0.06);
        color: #b8aa90; font-style: italic; font-size: 15px; line-height: 1.7;
      }
      .learn-prose a { color: #c4a04e; text-decoration: underline; text-underline-offset: 3px; }
      .learn-prose hr { border: none; border-top: 1px solid rgba(196,160,78,0.12); margin: 2rem 0; }
      .learn-prose code { background: rgba(196,160,78,0.1); color: #c4a04e; padding: 0.15em 0.4em; border-radius: 4px; font-size: 13px; }

      /* Narration highlight */
      .learn-narrating { animation: narrateGlow 1.4s ease-in-out infinite alternate; }
      @keyframes narrateGlow {
        from { box-shadow: 0 0 0 0 transparent; }
        to   { box-shadow: 0 0 28px 4px rgba(196,160,78,0.3), inset 0 0 0 2px rgba(196,160,78,0.12); border-radius: 12px; }
      }

      /* Original fade-up */
      @keyframes learnFadeUp {
        from { opacity: 0; transform: translateY(20px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      /* Quiz slide-in */
      @keyframes quizSlideIn {
        from { opacity: 0; transform: translateX(32px); }
        to   { opacity: 1; transform: translateX(0); }
      }

      /* Correct answer pulse */
      @keyframes quizPulse {
        0%   { transform: scale(1); }
        40%  { transform: scale(1.03); box-shadow: 0 0 0 4px rgba(109,181,122,0.25); }
        100% { transform: scale(1); }
      }

      /* Wrong answer shake */
      @keyframes quizShake {
        0%, 100% { transform: translateX(0); }
        20%  { transform: translateX(-7px); }
        40%  { transform: translateX(7px); }
        60%  { transform: translateX(-5px); }
        80%  { transform: translateX(5px); }
      }

      /* Timer urgent pulse */
      @keyframes timerUrgent {
        0%, 100% { opacity: 1; transform: scale(1); }
        50%  { opacity: 0.5; transform: scale(1.2); }
      }

      /* Score reveal */
      @keyframes scoreCountUp {
        from { opacity: 0; transform: scale(0.6); }
        60%  { transform: scale(1.1); }
        to   { opacity: 1; transform: scale(1); }
      }

      /* Stars drop in */
      @keyframes starDrop {
        from { opacity: 0; transform: translateY(-28px) scale(0.4); }
        60%  { transform: translateY(4px) scale(1.15); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }

      /* Confetti burst (uses --dx, --dy CSS vars) */
      @keyframes confettiBurst {
        from { opacity: 1; transform: translate(0, 0) scale(1); }
        to   { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(0); }
      }

      /* Badge reveal */
      @keyframes badgeReveal {
        from { opacity: 0; transform: scale(0) rotate(-180deg); }
        60%  { transform: scale(1.1) rotate(8deg); }
        to   { opacity: 1; transform: scale(1) rotate(0deg); }
      }

      /* Progress dot active pop */
      @keyframes dotPop {
        from { transform: scale(0.8); }
        60%  { transform: scale(1.3); }
        to   { transform: scale(1); }
      }
    `}</style>
  )
}
