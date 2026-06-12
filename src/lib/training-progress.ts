// Gamification engine for HFM training modules.
// All state lives in localStorage — backend stores only completed_lessons[].

// ── Minimal types (avoids import cycles with learn-screen) ────────────────────

interface MinLesson {
  id: string
  type: string
  is_preview: boolean
  quiz_questions?: { id: string }[]
}

interface MinModule {
  id: string
  title: string
  slug: string
  lessons: MinLesson[]
}

// ── Public interfaces ─────────────────────────────────────────────────────────

export type LessonAccess = 'locked' | 'unlocked' | 'completed'

export interface LessonStars {
  lessonId: string
  stars: 1 | 2 | 3
  quizScore?: number
  earnedAt: string
}

export interface ModuleBadge {
  moduleId: string
  moduleSlug: string
  moduleName: string
  badgeName: string
  earnedAt: string
}

export interface StreakState {
  current: number
  longest: number
  lastStudyDate: string
}

export interface GamificationState {
  stars: Record<string, LessonStars>
  badges: ModuleBadge[]
  streak: StreakState
  quizScores: Record<string, number>
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const GAMIFICATION_KEY = 'hfm_gamification'
export const QUIZ_TIME_PER_Q = 15
export const PASS_THRESHOLD = 80

export const MODULE_ORDER = [
  'Holistic Foundations',
  'Functional Nutrition 101',
  'Hormone Health Foundations',
  'Mind-Body Medicine',
  'Gut Health & Microbiome',
  'Energy Medicine Essentials',
]

export const BADGE_NAMES: Record<string, string> = {
  'Holistic Foundations':        'Root Chakra Scholar',
  'Functional Nutrition 101':    'Nourished Mind',
  'Hormone Health Foundations':  'Hormone Harmony',
  'Mind-Body Medicine':          'Body Whisperer',
  'Gut Health & Microbiome':     'Gut Guardian',
  'Energy Medicine Essentials':  'Energy Architect',
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function localDateStr(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

// ── State CRUD ────────────────────────────────────────────────────────────────

const EMPTY: GamificationState = {
  stars: {},
  badges: [],
  streak: { current: 0, longest: 0, lastStudyDate: '' },
  quizScores: {},
}

export function loadGamification(): GamificationState {
  try {
    const raw = localStorage.getItem(GAMIFICATION_KEY)
    if (!raw) return { ...EMPTY }
    return { ...EMPTY, ...JSON.parse(raw) as GamificationState }
  } catch {
    return { ...EMPTY }
  }
}

export function saveGamification(s: GamificationState): void {
  try { localStorage.setItem(GAMIFICATION_KEY, JSON.stringify(s)) } catch { /* ignore */ }
}

export function totalStars(gami: GamificationState): number {
  return Object.values(gami.stars).reduce((s, ls) => s + ls.stars, 0)
}

// ── Access logic ──────────────────────────────────────────────────────────────

export function lessonAccessState(
  lessonIndex: number,
  sortedLessons: MinLesson[],
  completedIds: Set<string>,
  quizScores: Record<string, number>,
  isEnrolled: boolean,
): LessonAccess {
  const lesson = sortedLessons[lessonIndex]
  if (!lesson) return 'locked'
  if (completedIds.has(lesson.id)) return 'completed'
  if (lesson.is_preview) return 'unlocked'
  if (!isEnrolled) return 'locked'
  if (lessonIndex === 0) return 'unlocked'

  const prev = sortedLessons[lessonIndex - 1]
  if (!completedIds.has(prev.id)) return 'locked'
  if (prev.type === 'quiz' && (quizScores[prev.id] ?? 0) < PASS_THRESHOLD) return 'locked'
  return 'unlocked'
}

export function isModuleFullyDone(
  mod: MinModule,
  completed: Set<string>,
  quizScores: Record<string, number>,
): boolean {
  if (mod.lessons.length === 0) return false
  const allDone = mod.lessons.every(l => l.is_preview || completed.has(l.id))
  const quizzesPassed = mod.lessons
    .filter(l => l.type === 'quiz')
    .every(l => (quizScores[l.id] ?? 0) >= PASS_THRESHOLD)
  return allDone && quizzesPassed
}

// ── Gamification mutations ────────────────────────────────────────────────────

export function starsForLesson(
  lessonType: string,
  quizScorePct?: number,
  elapsedMs?: number,
  totalTimeMs?: number,
): 1 | 2 | 3 {
  if (lessonType !== 'quiz') return 1
  const pct = quizScorePct ?? 0
  if (pct >= 100) return 3
  if (pct >= 80 && elapsedMs != null && totalTimeMs != null && elapsedMs <= totalTimeMs * 0.5) return 3
  if (pct >= 80) return 2
  return 1
}

export function recordStudyDay(streak: StreakState): StreakState {
  const today = localDateStr(new Date())
  if (streak.lastStudyDate === today) return streak
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const current = streak.lastStudyDate === localDateStr(yesterday) ? streak.current + 1 : 1
  return { current, longest: Math.max(streak.longest, current), lastStudyDate: today }
}

export function currentStreakDisplay(streak: StreakState): number {
  if (!streak.lastStudyDate) return 0
  const today = localDateStr(new Date())
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (streak.lastStudyDate === today || streak.lastStudyDate === localDateStr(yesterday)) {
    return streak.current
  }
  return 0
}

export function recordQuizScore(
  gami: GamificationState,
  lessonId: string,
  scorePct: number,
): GamificationState {
  const existing = gami.quizScores[lessonId] ?? 0
  if (scorePct <= existing) return gami
  return { ...gami, quizScores: { ...gami.quizScores, [lessonId]: scorePct } }
}

export function recordLessonStars(
  gami: GamificationState,
  lessonId: string,
  lessonType: string,
  quizScorePct?: number,
  elapsedMs?: number,
  totalTimeMs?: number,
): GamificationState {
  const stars = starsForLesson(lessonType, quizScorePct, elapsedMs, totalTimeMs)
  const existing = gami.stars[lessonId]
  if (existing && existing.stars >= stars) return gami
  return {
    ...gami,
    stars: {
      ...gami.stars,
      [lessonId]: { lessonId, stars, quizScore: quizScorePct, earnedAt: new Date().toISOString() },
    },
  }
}

export function maybeAwardBadge(
  mod: MinModule,
  completed: Set<string>,
  quizScores: Record<string, number>,
  gami: GamificationState,
): { gami: GamificationState; awarded?: ModuleBadge } {
  if (!isModuleFullyDone(mod, completed, quizScores)) return { gami }
  if (gami.badges.some(b => b.moduleId === mod.id)) return { gami }
  const badgeName = BADGE_NAMES[mod.title] ?? `${mod.title} Graduate`
  const awarded: ModuleBadge = {
    moduleId: mod.id,
    moduleSlug: mod.slug,
    moduleName: mod.title,
    badgeName,
    earnedAt: new Date().toISOString(),
  }
  return { gami: { ...gami, badges: [...gami.badges, awarded] }, awarded }
}
