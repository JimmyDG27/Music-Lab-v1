// services/lessons.js
import { supabase } from './supabase.js';

// ── Read ────────────────────────────────────────────────────────────────────

/**
 * Fetch all non-deleted lessons for a student, newest first.
 */
export async function getLessons(studentId) {
  const { data, error } = await supabase
    .from('lessons')
    .select(`
      id, student_id, teacher_id, held_at,
      vocal_technique, song_notes, homework, created_at,
      teacher:profiles!teacher_id(first_name, last_name)
    `)
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .order('held_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// ── Write ────────────────────────────────────────────────────────────────────

/**
 * Create a lesson. teacherId is the logged-in user's profile id.
 */
export async function createLesson(studentId, teacherId, { held_at, vocal_technique, song_notes, homework }) {
  const { error } = await supabase
    .from('lessons')
    .insert({
      student_id:      studentId,
      teacher_id:      teacherId,
      held_at,
      vocal_technique: vocal_technique || null,
      song_notes:      song_notes      || null,
      homework:        homework        || null,
    });

  if (error) throw error;
}

/**
 * Update an existing lesson's fields.
 */
export async function updateLesson(id, { held_at, vocal_technique, song_notes, homework }) {
  const { error } = await supabase
    .from('lessons')
    .update({
      held_at,
      vocal_technique: vocal_technique || null,
      song_notes:      song_notes      || null,
      homework:        homework        || null,
    })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Count non-deleted lessons.
 * Admin: pass no argument → all lessons.
 * Teacher: pass their profile id → only their lessons.
 */
export async function getLessonCount(teacherId = null) {
  let query = supabase
    .from('lessons')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);

  if (teacherId) query = query.eq('teacher_id', teacherId);

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/**
 * Count non-deleted lessons since the start of the current calendar month.
 * Teacher: pass their profile id → only their lessons.
 */
export async function getLessonCountThisMonth(teacherId = null) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  let query = supabase
    .from('lessons')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)
    .gte('held_at', startOfMonth);

  if (teacherId) query = query.eq('teacher_id', teacherId);

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/**
 * Lesson counts per student broken down by calendar month, for a specific teacher.
 * Returns { months: ['YYYY-MM', ...], rows: [{ name, initials, months: {}, total }] }
 * Used on the teacher dashboard modal.
 */
export async function getLessonsMonthlyByStudentForTeacher(teacherId) {
  const { data, error } = await supabase
    .from('lessons')
    .select('student_id, held_at, student:students!student_id(first_name, last_name)')
    .eq('teacher_id', teacherId)
    .is('deleted_at', null)
    .order('held_at', { ascending: true });

  if (error) throw error;

  const students = {};
  const monthSet = new Set();

  for (const lesson of data ?? []) {
    const sid   = lesson.student_id;
    const month = lesson.held_at?.slice(0, 7);
    if (!month) continue;

    monthSet.add(month);

    if (!students[sid]) {
      const s = lesson.student ?? {};
      students[sid] = {
        id:       sid,
        name:     [s.first_name, s.last_name].filter(Boolean).join(' ') || '—',
        initials: [(s.first_name ?? '').charAt(0), (s.last_name ?? '').charAt(0)]
                    .filter(Boolean).join('').toUpperCase() || '?',
        months:   {},
        total:    0,
      };
    }
    students[sid].months[month] = (students[sid].months[month] ?? 0) + 1;
    students[sid].total++;
  }

  // Always include current month
  const now          = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  monthSet.add(currentMonth);

  // Expand to contiguous range (no gaps)
  const sorted = [...monthSet].sort();
  const allMonths = [];
  if (sorted.length) {
    let [y, m] = sorted[0].split('-').map(Number);
    const [ey, em] = sorted[sorted.length - 1].split('-').map(Number);
    while (y < ey || (y === ey && m <= em)) {
      allMonths.push(`${y}-${String(m).padStart(2, '0')}`);
      if (++m > 12) { m = 1; y++; }
    }
  }

  const rows = Object.values(students).sort((a, b) => b.total - a.total);
  return { months: allMonths, rows };
}

/**
 * Count non-deleted lessons within the previous calendar month.
 * Teacher: pass their profile id → only their lessons.
 */
export async function getLessonCountLastMonth(teacherId = null) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const end   = new Date(now.getFullYear(), now.getMonth(),     1).toISOString();

  let query = supabase
    .from('lessons')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)
    .gte('held_at', start)
    .lt('held_at', end);

  if (teacherId) query = query.eq('teacher_id', teacherId);

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/**
 * Lesson counts per teacher broken down by calendar month.
 * Returns { months: ['YYYY-MM', ...], rows: [{ name, initials, months: {}, total }] }
 * All months from the first ever lesson to the current month are included (no gaps).
 * Admin only.
 */
export async function getLessonsMonthlyByTeacher() {
  const { data, error } = await supabase
    .from('lessons')
    .select('teacher_id, held_at, teacher:profiles!teacher_id(first_name, last_name)')
    .is('deleted_at', null)
    .order('held_at', { ascending: true });

  if (error) throw error;

  const teachers = {};
  const monthSet = new Set();

  for (const lesson of data ?? []) {
    const tid   = lesson.teacher_id;
    const month = lesson.held_at?.slice(0, 7); // 'YYYY-MM'
    if (!month) continue;

    monthSet.add(month);

    if (!teachers[tid]) {
      const t = lesson.teacher ?? {};
      teachers[tid] = {
        id:       tid,
        name:     [t.first_name, t.last_name].filter(Boolean).join(' ') || '—',
        initials: [(t.first_name ?? '').charAt(0), (t.last_name ?? '').charAt(0)]
                    .filter(Boolean).join('').toUpperCase() || '?',
        months:   {},
        total:    0,
      };
    }
    teachers[tid].months[month] = (teachers[tid].months[month] ?? 0) + 1;
    teachers[tid].total++;
  }

  // Always include current month even if no lessons yet
  const now          = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  monthSet.add(currentMonth);

  // Expand to a contiguous range (no gaps)
  const sorted = [...monthSet].sort();
  const allMonths = [];
  if (sorted.length) {
    let [y, m] = sorted[0].split('-').map(Number);
    const [ey, em] = sorted[sorted.length - 1].split('-').map(Number);
    while (y < ey || (y === ey && m <= em)) {
      allMonths.push(`${y}-${String(m).padStart(2, '0')}`);
      if (++m > 12) { m = 1; y++; }
    }
  }

  const rows = Object.values(teachers).sort((a, b) => b.total - a.total);
  return { months: allMonths, rows };
}

/**
 * Aggregate lesson counts per teacher — total, this month, last month.
 * Returns an array sorted by total (desc).
 * Admin only (all lessons visible via RLS).
 */
export async function getLessonsByTeacher() {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const endOfLastMonth   = startOfThisMonth; // last month ends where this month begins

  const { data, error } = await supabase
    .from('lessons')
    .select('teacher_id, held_at, teacher:profiles!teacher_id(first_name, last_name)')
    .is('deleted_at', null);

  if (error) throw error;

  const map = {};
  for (const lesson of data ?? []) {
    const tid = lesson.teacher_id;
    if (!map[tid]) {
      const t = lesson.teacher ?? {};
      map[tid] = {
        id:        tid,
        name:      [t.first_name, t.last_name].filter(Boolean).join(' ') || '—',
        initials:  [(t.first_name ?? '').charAt(0), (t.last_name ?? '').charAt(0)]
                     .filter(Boolean).join('').toUpperCase() || '?',
        total:     0,
        thisMonth: 0,
        lastMonth: 0,
      };
    }
    map[tid].total++;
    if (lesson.held_at >= startOfThisMonth)                                   map[tid].thisMonth++;
    if (lesson.held_at >= startOfLastMonth && lesson.held_at < endOfLastMonth) map[tid].lastMonth++;
  }

  return Object.values(map).sort((a, b) => b.total - a.total);
}

/**
 * Soft-delete a lesson (Admin only — enforced by RLS).
 */
export async function softDeleteLesson(id) {
  const { error } = await supabase
    .from('lessons')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}
