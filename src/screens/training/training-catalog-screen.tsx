import { useState, useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowRight01Icon,
  BookOpen01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  Fire03Icon,
  HonourStarIcon,
  LockIcon,
  SchoolIcon,
  UserGroupIcon,
  PlayCircleIcon,
  RefreshIcon,
} from '@hugeicons/core-free-icons'
import {
  loadGamification,
  MODULE_ORDER,
  BADGE_NAMES,
  currentStreakDisplay,
  totalStars,
  type GamificationState,
} from '@/lib/training-progress'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Lesson {
  id: string
  type: string
  order: number
  duration_minutes?: number
  is_preview: boolean
}

interface TrainingModule {
  id: string
  title: string
  slug: string
  description: string
  category: string
  status: string
  lessons: Lesson[]
  total_duration_minutes: number
  enrolled_count: number
}

interface Enrollment {
  progress: number
  completed_lessons: string[]
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ENROLLMENT_KEY = (id: string) => `hfm_enrollment_${id}`

const MODULE_IMAGES: Record<string, string> = {
  'Holistic Foundations':       'photo-1490730141103-6cac27aaab94',
  'Functional Nutrition 101':   'photo-1490645935967-10de6ba17061',
  'Hormone Health Foundations': 'photo-1544367567-0f2fcb009e0b',
  'Mind-Body Medicine':         'photo-1506905925346-21bda4d32df4',
  'Gut Health & Microbiome':    'photo-1511688878353-3a2f5be94cd7',
  'Energy Medicine Essentials': 'photo-1518531933037-91b2f5f229cc',
}

const MODULE_TAGLINES: Record<string, string> = {
  'Holistic Foundations':       'Build the pillars of whole-body wellness from the ground up.',
  'Functional Nutrition 101':   'Learn to eat as medicine — nourishing every cell intentionally.',
  'Hormone Health Foundations': 'Restore hormonal balance and reclaim your vitality.',
  'Mind-Body Medicine':         'Harness the healing power of thought, emotion, and breath.',
  'Gut Health & Microbiome':    'Cultivate your inner ecosystem for lifelong immunity and energy.',
  'Energy Medicine Essentials': 'Tune your biofield and awaken your body\'s subtle healing forces.',
}

const CATEGORY_COLORS: Record<string, { from: string; to: string; glow: string }> = {
  'Holistic Foundations':       { from: '#a3843b', to: '#c4a04e', glow: 'rgba(196,160,78,0.4)' },
  'Functional Nutrition 101':   { from: '#3b8a5a', to: '#5ab57a', glow: 'rgba(90,181,122,0.4)' },
  'Hormone Health Foundations': { from: '#6b3b8a', to: '#9a5ab5', glow: 'rgba(154,90,181,0.4)' },
  'Mind-Body Medicine':         { from: '#3b6b8a', to: '#5a9ab5', glow: 'rgba(90,154,181,0.4)' },
  'Gut Health & Microbiome':    { from: '#8a5a3b', to: '#b57a5a', glow: 'rgba(181,122,90,0.4)' },
  'Energy Medicine Essentials': { from: '#3b4a8a', to: '#5a6ab5', glow: 'rgba(90,106,181,0.4)' },
}

function unsplashUrl(id: string, w = 1200) {
  return `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`
}

function formatDuration(min: number) {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

// ── Animated Counter ───────────────────────────────────────────────────────────

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  const started = useRef(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (started.current || value === 0) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        let cur = 0
        const step = () => {
          cur = Math.min(cur + Math.ceil(value / 40), value)
          setDisplay(cur)
          if (cur < value) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      }
    }, { threshold: 0.5 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value])

  return <span ref={ref}>{display}</span>
}

// ── Module Card ────────────────────────────────────────────────────────────────

function ModuleCard({
  mod, index, isLocked, enrollment, gami, onNavigate,
}: {
  mod: TrainingModule
  index: number
  isLocked: boolean
  enrollment: Enrollment | null
  gami: GamificationState
  onNavigate: (slug: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const imgId = MODULE_IMAGES[mod.title] ?? 'photo-1490730141103-6cac27aaab94'
  const colors = CATEGORY_COLORS[mod.title] ?? CATEGORY_COLORS['Holistic Foundations']
  const tagline = MODULE_TAGLINES[mod.title] ?? mod.description
  const badgeName = BADGE_NAMES[mod.title]
  const badgeEarned = gami.badges.some(b => b.moduleId === mod.id)
  const isCompleted = badgeEarned
  const progress = enrollment?.progress ?? 0
  const isStarted = !isCompleted && progress > 0
  const lessonCount = mod.lessons.length

  const status: 'locked' | 'completed' | 'started' | 'available' =
    isLocked ? 'locked' : isCompleted ? 'completed' : isStarted ? 'started' : 'available'

  const ctaLabel = status === 'completed' ? 'Review Module'
    : status === 'started' ? 'Continue Learning'
    : status === 'locked' ? 'Locked'
    : 'Start Learning'

  const prevModuleName = index > 0 ? MODULE_ORDER[index - 1] : null

  return (
    <div
      className="catalog-module-card relative cursor-pointer overflow-hidden rounded-3xl"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !isLocked && onNavigate(mod.slug)}
      style={{
        height: '320px',
        border: status === 'started' ? `1.5px solid ${colors.to}` :
               status === 'completed' ? '1.5px solid rgba(109,181,122,0.5)' :
               '1.5px solid rgba(196,160,78,0.1)',
        boxShadow: hovered && !isLocked ? `0 24px 60px ${colors.glow}, 0 0 0 1px ${colors.to}` :
                   status === 'started' ? `0 8px 32px ${colors.glow}` : 'none',
        transition: 'box-shadow 0.3s ease, transform 0.3s ease',
        transform: hovered && !isLocked ? 'translateY(-3px)' : 'none',
        cursor: isLocked ? 'default' : 'pointer',
      }}
    >
      {/* Background image */}
      <img
        src={unsplashUrl(imgId, 1200)} alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          filter: isLocked ? 'grayscale(80%) brightness(0.25)' : 'brightness(0.32)',
          transition: 'filter 0.4s ease',
        }}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
      />

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: isLocked
            ? 'linear-gradient(135deg, rgba(10,8,6,0.85) 0%, rgba(20,16,11,0.9) 100%)'
            : `linear-gradient(135deg, rgba(10,8,6,0.7) 0%, rgba(${
                status === 'completed' ? '10,30,15' : '10,8,6'
              },0.75) 100%)`,
        }}
      />

      {/* Progress glow at bottom */}
      {status === 'started' && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1"
          style={{ background: `linear-gradient(90deg, transparent, ${colors.from}, ${colors.to}, transparent)` }}
        />
      )}

      {/* Module number — large watermark */}
      <div
        className="absolute right-6 top-4 font-black leading-none tabular-nums select-none"
        style={{
          fontSize: '110px',
          color: isLocked ? 'rgba(154,136,112,0.06)' : 'rgba(196,160,78,0.08)',
          lineHeight: 1,
        }}
      >
        {String(index + 1).padStart(2, '0')}
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-between p-7">
        {/* Top row */}
        <div className="flex items-start justify-between">
          <div>
            {/* Module number badge */}
            <div
              className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
              style={{
                background: isLocked ? 'rgba(154,136,112,0.12)' : `rgba(${
                  status === 'completed' ? '109,181,122' : '196,160,78'
                },0.15)`,
                color: isLocked ? '#9a8870' : status === 'completed' ? '#6db57a' : colors.to,
                border: `1px solid ${isLocked ? 'rgba(154,136,112,0.2)' : status === 'completed' ? 'rgba(109,181,122,0.3)' : `rgba(196,160,78,0.25)`}`,
              }}
            >
              {status === 'completed' ? (
                <><HugeiconsIcon icon={CheckmarkCircle01Icon} size={10} /> Badge Earned</>
              ) : status === 'locked' ? (
                <><HugeiconsIcon icon={LockIcon} size={10} /> Module {index + 1}</>
              ) : (
                <>Module {index + 1} · {mod.category}</>
              )}
            </div>

            <h2
              className="text-[26px] font-bold leading-tight"
              style={{ color: isLocked ? '#6b6057' : '#ede5d8' }}
            >
              {mod.title}
            </h2>

            <p
              className="mt-2 max-w-xs text-[13px] leading-relaxed"
              style={{ color: isLocked ? '#4a4238' : '#9a8870' }}
            >
              {isLocked && prevModuleName ? `Complete "${prevModuleName}" to unlock this module.` : tagline}
            </p>
          </div>

          {/* Lock or Badge icon */}
          {isLocked && (
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: 'rgba(50,40,30,0.6)', border: '1px solid rgba(154,136,112,0.2)' }}
            >
              <HugeiconsIcon icon={LockIcon} size={22} style={{ color: 'rgba(154,136,112,0.5)' }} />
            </div>
          )}
          {isCompleted && badgeName && (
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: 'rgba(109,181,122,0.15)', border: '1px solid rgba(109,181,122,0.3)' }}
            >
              <HugeiconsIcon icon={HonourStarIcon} size={22} style={{ color: '#6db57a' }} />
            </div>
          )}
        </div>

        {/* Bottom row */}
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-2">
            {/* Meta row */}
            <div className="flex items-center gap-3 text-[11px]" style={{ color: isLocked ? '#4a4238' : '#7a6e60' }}>
              <span className="flex items-center gap-1">
                <HugeiconsIcon icon={BookOpen01Icon} size={11} />
                {lessonCount} lessons
              </span>
              {mod.total_duration_minutes > 0 && (
                <span className="flex items-center gap-1">
                  <HugeiconsIcon icon={Clock01Icon} size={11} />
                  {formatDuration(mod.total_duration_minutes)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <HugeiconsIcon icon={UserGroupIcon} size={11} />
                {mod.enrolled_count}
              </span>
            </div>

            {/* Progress bar */}
            {status === 'started' && (
              <div className="w-48">
                <div className="flex items-center justify-between mb-1 text-[10px]" style={{ color: colors.to }}>
                  <span>Progress</span>
                  <span className="font-semibold">{progress}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(196,160,78,0.15)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${colors.from}, ${colors.to})` }}
                  />
                </div>
              </div>
            )}

            {/* Badge name if completed */}
            {isCompleted && badgeName && (
              <div className="flex items-center gap-1.5 text-[11px]" style={{ color: '#6db57a' }}>
                <HugeiconsIcon icon={HonourStarIcon} size={12} />
                <span className="font-semibold">{badgeName}</span>
              </div>
            )}
          </div>

          {/* CTA button */}
          {!isLocked && (
            <button
              className="flex items-center gap-2 rounded-2xl px-5 py-3 text-[13px] font-semibold text-white transition-all"
              style={{
                background: isCompleted
                  ? 'rgba(109,181,122,0.2)'
                  : `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
                color: isCompleted ? '#6db57a' : 'white',
                border: isCompleted ? '1px solid rgba(109,181,122,0.4)' : 'none',
                boxShadow: !isCompleted ? `0 4px 20px ${colors.glow}` : 'none',
              }}
              onClick={e => { e.stopPropagation(); onNavigate(mod.slug) }}
            >
              {isCompleted ? (
                <HugeiconsIcon icon={RefreshIcon} size={14} />
              ) : status === 'started' ? (
                <HugeiconsIcon icon={PlayCircleIcon} size={14} />
              ) : (
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
              )}
              {ctaLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export function TrainingCatalogScreen() {
  const navigate = useNavigate()
  const [modules, setModules] = useState<TrainingModule[]>([])
  const [loading, setLoading] = useState(true)
  const [gami] = useState<GamificationState>(() => loadGamification())
  const [enrollments, setEnrollments] = useState<Record<string, Enrollment>>({})
  const [heroVisible, setHeroVisible] = useState(false)

  const streak = currentStreakDisplay(gami.streak)
  const stars = totalStars(gami)

  // Load published modules
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/training/modules?brand=hfm&status=published')
        if (res.ok) {
          const data = await res.json() as { modules?: TrainingModule[] }
          const mods = data.modules ?? []
          // Sort by MODULE_ORDER, then by whatever comes after
          const ordered = MODULE_ORDER
            .map(title => mods.find(m => m.title === title))
            .filter((m): m is TrainingModule => !!m)
          const remaining = mods.filter(m => !MODULE_ORDER.includes(m.title))
          setModules([...ordered, ...remaining])
        }
      } catch { /* ignore */ }
      finally { setLoading(false) }
    })()
  }, [])

  // Load enrollments from localStorage
  useEffect(() => {
    const map: Record<string, Enrollment> = {}
    modules.forEach(m => {
      const raw = localStorage.getItem(ENROLLMENT_KEY(m.id))
      if (raw) {
        try { map[m.id] = JSON.parse(raw) as Enrollment } catch { /* ignore */ }
      }
    })
    setEnrollments(map)
  }, [modules])

  // Hero entrance animation
  useEffect(() => { setTimeout(() => setHeroVisible(true), 100) }, [])

  const isModuleLocked = (_modTitle: string, modIdx: number): boolean => {
    if (modIdx === 0) return false
    const prevTitle = MODULE_ORDER[modIdx - 1]
    if (!prevTitle) return false
    return !gami.badges.some(b => b.moduleName === prevTitle)
  }

  const handleNavigate = (slug: string) => {
    void navigate({ to: '/learn/$slug', params: { slug } })
  }

  // Stat counts
  const totalModules = modules.length
  const completedCount = gami.badges.length
  const inProgressCount = Object.values(enrollments).filter(e => e.progress > 0 && e.progress < 100).length
  const totalLessons = modules.reduce((s, m) => s + m.lessons.length, 0)

  return (
    <div style={{ minHeight: '100vh', background: '#0e0c09', color: '#ede5d8' }}>
      <CatalogStyles />

      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden"
        style={{
          minHeight: '420px',
          background: 'linear-gradient(135deg, #0e0c09 0%, #1a1408 40%, #0e0c09 100%)',
        }}
      >
        {/* Ambient glow orbs */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: '600px', height: '600px',
            top: '-200px', left: '-100px',
            background: 'radial-gradient(ellipse, rgba(196,160,78,0.08) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            width: '400px', height: '400px',
            top: '-100px', right: '10%',
            background: 'radial-gradient(ellipse, rgba(122,154,181,0.06) 0%, transparent 70%)',
          }}
        />

        <div
          className="relative mx-auto max-w-4xl px-6 py-16 transition-all duration-700"
          style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(24px)' }}
        >
          {/* Gamification chips */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            {streak > 0 && (
              <div
                className="flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] font-bold"
                style={{ background: 'rgba(196,160,78,0.12)', color: '#c4a04e', border: '1px solid rgba(196,160,78,0.25)' }}
              >
                <HugeiconsIcon icon={Fire03Icon} size={13} />
                {streak} day streak
              </div>
            )}
            {stars > 0 && (
              <div
                className="flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] font-bold"
                style={{ background: 'rgba(196,160,78,0.12)', color: '#c4a04e', border: '1px solid rgba(196,160,78,0.25)' }}
              >
                <HugeiconsIcon icon={HonourStarIcon} size={13} />
                {stars} stars earned
              </div>
            )}
            {completedCount > 0 && (
              <div
                className="flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] font-bold"
                style={{ background: 'rgba(109,181,122,0.12)', color: '#6db57a', border: '1px solid rgba(109,181,122,0.25)' }}
              >
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} />
                {completedCount} module{completedCount !== 1 ? 's' : ''} complete
              </div>
            )}
          </div>

          <div className="mb-2 text-[12px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(196,160,78,0.6)' }}>
            HFM Academy
          </div>
          <h1
            className="text-[48px] font-black leading-none tracking-tight"
            style={{
              color: 'transparent',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              backgroundImage: 'linear-gradient(135deg, #ede5d8 0%, #c4a04e 50%, #ede5d8 100%)',
            }}
          >
            Your Healing
            <br />Journey
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed" style={{ color: '#9a8870' }}>
            A curated path through holistic medicine — from foundational principles to advanced energy healing.
            Complete each module to unlock the next chapter of your transformation.
          </p>

          {/* Stat row */}
          {!loading && (
            <div className="mt-8 flex flex-wrap gap-6 text-center">
              {[
                { label: 'Modules', value: totalModules, color: '#c4a04e' },
                { label: 'Lessons', value: totalLessons, color: '#c4a04e' },
                { label: 'In Progress', value: inProgressCount, color: '#7ab5a0' },
                { label: 'Complete', value: completedCount, color: '#6db57a' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex flex-col items-center">
                  <span className="text-[32px] font-black tabular-nums" style={{ color }}>
                    <AnimatedNumber value={value} />
                  </span>
                  <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: '#7a6e60' }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom border glow */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(196,160,78,0.3), transparent)' }}
        />
      </div>

      {/* ── Badge Gallery (if any earned) ── */}
      {gami.badges.length > 0 && (
        <div
          className="border-b px-6 py-5"
          style={{ background: 'rgba(20,16,11,0.6)', borderColor: 'rgba(196,160,78,0.1)' }}
        >
          <div className="mx-auto max-w-4xl">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(196,160,78,0.5)' }}>
              Badges Earned
            </p>
            <div className="flex flex-wrap gap-3">
              {gami.badges.map(badge => (
                <div
                  key={badge.moduleId}
                  className="flex items-center gap-2 rounded-2xl px-4 py-2"
                  style={{ background: 'rgba(196,160,78,0.08)', border: '1px solid rgba(196,160,78,0.2)' }}
                >
                  <HugeiconsIcon icon={HonourStarIcon} size={14} style={{ color: '#c4a04e' }} />
                  <span className="text-[12px] font-semibold" style={{ color: '#c4a04e' }}>{badge.badgeName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Module Journey ── */}
      <div className="mx-auto max-w-4xl px-6 py-10">
        {loading ? (
          <div className="flex flex-col gap-5">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-3xl"
                style={{ height: '320px', background: 'rgba(196,160,78,0.04)', animationDelay: `${i * 0.08}s` }}
              />
            ))}
          </div>
        ) : modules.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <HugeiconsIcon icon={SchoolIcon} size={52} className="mb-5" style={{ color: 'rgba(196,160,78,0.2)' }} />
            <h2 className="text-[20px] font-bold" style={{ color: '#ede5d8' }}>No Modules Published Yet</h2>
            <p className="mt-2 text-[13px]" style={{ color: '#9a8870' }}>Check back soon — your curriculum is being prepared.</p>
          </div>
        ) : (
          <div className="relative flex flex-col gap-0">
            {/* Vertical journey path — desktop only */}
            <div
              className="absolute left-[26px] top-8 bottom-8 w-px hidden sm:block"
              style={{ background: 'linear-gradient(180deg, rgba(196,160,78,0.3) 0%, rgba(196,160,78,0.05) 100%)' }}
            />

            {modules.map((mod, i) => {
              const locked = isModuleLocked(mod.title, i)
              const enrollment = enrollments[mod.id] ?? null
              return (
                <div key={mod.id} className="relative flex flex-col">
                  {/* Journey node — desktop only */}
                  <div className="mb-4 hidden items-center gap-4 sm:flex">
                    <div
                      className="relative z-10 flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full font-black text-[16px] tabular-nums"
                      style={{
                        background: locked
                          ? 'rgba(30,24,18,0.8)'
                          : gami.badges.some(b => b.moduleId === mod.id)
                          ? 'rgba(109,181,122,0.15)'
                          : enrollment?.progress
                          ? 'rgba(196,160,78,0.15)'
                          : 'rgba(196,160,78,0.08)',
                        border: locked
                          ? '2px solid rgba(154,136,112,0.15)'
                          : gami.badges.some(b => b.moduleId === mod.id)
                          ? '2px solid rgba(109,181,122,0.5)'
                          : '2px solid rgba(196,160,78,0.35)',
                        color: locked
                          ? 'rgba(154,136,112,0.3)'
                          : gami.badges.some(b => b.moduleId === mod.id)
                          ? '#6db57a'
                          : '#c4a04e',
                      }}
                    >
                      {gami.badges.some(b => b.moduleId === mod.id) ? (
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={20} />
                      ) : locked ? (
                        <HugeiconsIcon icon={LockIcon} size={18} />
                      ) : (
                        String(i + 1).padStart(2, '0')
                      )}
                    </div>
                    <div
                      className="text-[11px] font-bold uppercase tracking-widest"
                      style={{ color: locked ? 'rgba(154,136,112,0.3)' : 'rgba(196,160,78,0.5)' }}
                    >
                      {locked ? 'Locked' : gami.badges.some(b => b.moduleId === mod.id) ? 'Complete' : enrollment?.progress ? 'In Progress' : 'Available'}
                    </div>
                  </div>

                  {/* Card */}
                  <div
                    className="mb-8 sm:ml-[68px]"
                    style={{ animation: `catalogSlideIn 0.5s cubic-bezier(0.22,1,0.36,1) both`, animationDelay: `${i * 0.1}s` }}
                  >
                    <ModuleCard
                      mod={mod}
                      index={i}
                      isLocked={locked}
                      enrollment={enrollment}
                      gami={gami}
                      onNavigate={handleNavigate}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <footer
        className="py-8 text-center text-[11px]"
        style={{ color: 'rgba(154,136,112,0.4)', borderTop: '1px solid rgba(196,160,78,0.06)' }}
      >
        © {new Date().getFullYear()} HFM Intelligence · Healing through knowledge
      </footer>
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

function CatalogStyles() {
  return (
    <style>{`
      @keyframes catalogSlideIn {
        from { opacity: 0; transform: translateX(-20px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      .catalog-module-card { will-change: transform, box-shadow; }
    `}</style>
  )
}
