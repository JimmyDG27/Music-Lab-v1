-- ─────────────────────────────────────────────────────────────────────────────
-- SEED: More students, assignments, lessons & songs
-- Adds students for Dimitar Emilov, lessons for Sofia, and assistant assignment
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Known profile UUIDs (for reference) ──────────────────────────────────────
-- admin         : a9358aa6-1c7a-4ad2-b636-d2325dc8cc36  (Dimitar Georgiev)
-- teacher       : 2882ca6b-02ea-46ef-bc8b-e543d09b9101  (Dimitar Emilov)
-- teacher       : cc389211-628c-4779-afa3-c5a9765eacbf  (Denitsa Karaslavova)
-- teacher       : e93e3ee5-901b-4505-bb65-ef11116337e2  (Vesela Todorova)
--
-- Existing student UUIDs used below:
-- Sofia Dimitrova   : 11111111-0000-0000-0000-000000000003
-- Elena Petrova     : 11111111-0000-0000-0000-000000000001
-- Martin Stoyanov   : 11111111-0000-0000-0000-000000000002


-- ── 1. NEW STUDENTS ───────────────────────────────────────────────────────────

insert into public.students (id, created_by, first_name, last_name, phone, email, birth_date, is_active, created_at, updated_at)
values
  (
    '22222222-0000-0000-0000-000000000001',
    'a9358aa6-1c7a-4ad2-b636-d2325dc8cc36',
    'Viktor', 'Popov',
    '+359 888 100 201', 'viktor.popov@example.com',
    '2005-03-14', true,
    '2026-01-05 09:00:00+00', '2026-01-05 09:00:00+00'
  ),
  (
    '22222222-0000-0000-0000-000000000002',
    'a9358aa6-1c7a-4ad2-b636-d2325dc8cc36',
    'Nikoleta', 'Hristova',
    '+359 888 100 202', 'nikoleta.h@example.com',
    '2007-07-22', true,
    '2026-01-08 10:00:00+00', '2026-01-08 10:00:00+00'
  ),
  (
    '22222222-0000-0000-0000-000000000003',
    'a9358aa6-1c7a-4ad2-b636-d2325dc8cc36',
    'Boyan', 'Angelov',
    '+359 888 100 203', 'boyan.angelov@example.com',
    '2009-11-30', true,
    '2026-01-10 11:00:00+00', '2026-01-10 11:00:00+00'
  );


-- ── 2. STUDENT PARENTS ────────────────────────────────────────────────────────

insert into public.student_parents (student_id, full_name, relation, phone, email)
values
  ('22222222-0000-0000-0000-000000000001', 'Gergana Popova',  'mother', '+359 888 200 201', 'gergana.popova@example.com'),
  ('22222222-0000-0000-0000-000000000002', 'Ivanka Hristova', 'mother', '+359 888 200 202', 'ivanka.h@example.com'),
  ('22222222-0000-0000-0000-000000000003', 'Petar Angelov',   'father', '+359 888 200 203', 'petar.angelov@example.com');


-- ── 3. PRIMARY ASSIGNMENTS (Dimitar Emilov → new students) ────────────────────

insert into public.student_teacher_assignments (student_id, teacher_id, role, active_from, active_to, created_by, created_at)
values
  (
    '22222222-0000-0000-0000-000000000001',
    '2882ca6b-02ea-46ef-bc8b-e543d09b9101',
    'primary', null, null,
    'a9358aa6-1c7a-4ad2-b636-d2325dc8cc36',
    '2026-01-05 09:00:00+00'
  ),
  (
    '22222222-0000-0000-0000-000000000002',
    '2882ca6b-02ea-46ef-bc8b-e543d09b9101',
    'primary', null, null,
    'a9358aa6-1c7a-4ad2-b636-d2325dc8cc36',
    '2026-01-08 10:00:00+00'
  ),
  (
    '22222222-0000-0000-0000-000000000003',
    '2882ca6b-02ea-46ef-bc8b-e543d09b9101',
    'primary', null, null,
    'a9358aa6-1c7a-4ad2-b636-d2325dc8cc36',
    '2026-01-10 11:00:00+00'
  );


-- ── 4. ASSISTANT ASSIGNMENT (Dimitar Emilov → Martin Stoyanov, past window) ──
-- Dimitar assisted Denitsa with Martin from Nov–Dec 2025 (active_to is set → historical)

insert into public.student_teacher_assignments (student_id, teacher_id, role, active_from, active_to, created_by, created_at)
values
  (
    '11111111-0000-0000-0000-000000000002',
    '2882ca6b-02ea-46ef-bc8b-e543d09b9101',
    'assistant',
    '2025-11-01 00:00:00+00',
    '2025-12-31 23:59:59+00',
    'a9358aa6-1c7a-4ad2-b636-d2325dc8cc36',
    '2025-11-01 09:00:00+00'
  );

-- ── 5. ACTIVE ASSISTANT ASSIGNMENT (Dimitar Emilov → Elena Petrova, ongoing) ─

insert into public.student_teacher_assignments (student_id, teacher_id, role, active_from, active_to, created_by, created_at)
values
  (
    '11111111-0000-0000-0000-000000000001',
    '2882ca6b-02ea-46ef-bc8b-e543d09b9101',
    'assistant',
    '2026-02-01 00:00:00+00',
    null,
    'a9358aa6-1c7a-4ad2-b636-d2325dc8cc36',
    '2026-02-01 09:00:00+00'
  );


-- ── 6. LESSONS — Sofia Dimitrova (Vesela) ─────────────────────────────────────

insert into public.lessons (student_id, teacher_id, held_at, vocal_technique, song_notes, homework, created_at, updated_at)
values
  (
    '11111111-0000-0000-0000-000000000003',
    'e93e3ee5-901b-4505-bb65-ef11116337e2',
    '2026-02-24 16:00:00+00',
    'Mixed voice placement exercises — alternating between chest and head resonance on descending scales. Sofia tends to push too hard above E4.',
    'Good progress on "Shallow" — chorus dynamics improving. Needs softer attack on the intro phrase.',
    'Practice the pre-chorus of "Shallow" at 80% tempo with a metronome. Focus on breath before each phrase.',
    '2026-02-24 17:30:00+00', '2026-02-24 17:30:00+00'
  ),
  (
    '11111111-0000-0000-0000-000000000003',
    'e93e3ee5-901b-4505-bb65-ef11116337e2',
    '2026-02-10 16:00:00+00',
    'Sustained vowel exercises (/a/, /e/, /i/) on a 5-note scale. Worked on keeping the soft palate raised throughout.',
    'Started "All of Me" — identified key challenge areas in the bridge (F4–A4 passaggio zone).',
    'Hum through the bridge of "All of Me" daily. Record yourself once and send the audio.',
    '2026-02-10 17:15:00+00', '2026-02-10 17:15:00+00'
  ),
  (
    '11111111-0000-0000-0000-000000000003',
    'e93e3ee5-901b-4505-bb65-ef11116337e2',
    '2026-01-27 16:00:00+00',
    'Sirens from chest to head voice — identifying register transition. Worked on blending through the passaggio.',
    'Listened to reference recording of "Shallow" together. Discussed phrasing choices and where to breathe.',
    'Listen to the original "Shallow" 3× and mark breathing points on printed lyrics.',
    '2026-01-27 17:00:00+00', '2026-01-27 17:00:00+00'
  ),
  (
    '11111111-0000-0000-0000-000000000003',
    'e93e3ee5-901b-4505-bb65-ef11116337e2',
    '2026-01-13 16:00:00+00',
    'First lesson. Assessed vocal range: approximately A3–E5. Warm-up with lip trills and staccato scales.',
    'Discussed repertoire goals. Sofia wants to focus on pop/ballads. Chose "Shallow" as primary song.',
    'Warm up for 10 min every day (lip trills + humming). Listen to "Shallow" and "All of Me".',
    '2026-01-13 17:00:00+00', '2026-01-13 17:00:00+00'
  );


-- ── 7. LESSONS — Viktor Popov (Dimitar Emilov) ────────────────────────────────

insert into public.lessons (student_id, teacher_id, held_at, vocal_technique, song_notes, homework, created_at, updated_at)
values
  (
    '22222222-0000-0000-0000-000000000001',
    '2882ca6b-02ea-46ef-bc8b-e543d09b9101',
    '2026-02-25 18:00:00+00',
    'Chest voice strengthening on arpeggios. Dimitar identified a tendency to go into falsetto prematurely around C4. Worked on maintaining support through the break.',
    'Great progress on "Circles" — Viktor is gaining confidence in the lower register.',
    'Practice "Circles" verse at half tempo. Record and compare to previous week.',
    '2026-02-25 19:30:00+00', '2026-02-25 19:30:00+00'
  ),
  (
    '22222222-0000-0000-0000-000000000001',
    '2882ca6b-02ea-46ef-bc8b-e543d09b9101',
    '2026-02-11 18:00:00+00',
    'Breath support basics — diaphragm activation exercises lying down, then standing. Introduced "hiss and buzz" technique.',
    'Introduced "Circles" by Post Malone. Worked on verse melody first.',
    'Practice breathing exercises 5 min/day. Memorise the verse lyrics of "Circles".',
    '2026-02-11 19:00:00+00', '2026-02-11 19:00:00+00'
  ),
  (
    '22222222-0000-0000-0000-000000000001',
    '2882ca6b-02ea-46ef-bc8b-e543d09b9101',
    '2026-01-28 18:00:00+00',
    'First lesson. Range assessment: G2–G4 comfortably, can reach C5 in head voice. Warm: staccato eighth notes on /ma/ and /mi/.',
    'Discussed goals — Viktor wants to perform at the school recital in June. Will focus on contemporary pop-R&B repertoire.',
    'Daily humming warm-up (10 min). Listen to 3 reference artists Viktor likes and share with teacher.',
    '2026-01-28 19:00:00+00', '2026-01-28 19:00:00+00'
  );


-- ── 8. LESSONS — Nikoleta Hristova (Dimitar Emilov) ──────────────────────────

insert into public.lessons (student_id, teacher_id, held_at, vocal_technique, song_notes, homework, created_at, updated_at)
values
  (
    '22222222-0000-0000-0000-000000000002',
    '2882ca6b-02ea-46ef-bc8b-e543d09b9101',
    '2026-02-26 15:00:00+00',
    'Legato line work on a slow 5-note descending scale. Focused on connecting notes without glottal attacks. Nikoleta has a natural bright tone — working to add warmth.',
    '"Lover" by Taylor Swift — chorus is sounding great. Verse phrasing still a bit choppy; needs more continuous air flow.',
    'Sing "Lover" verse on /lu/ syllable (no words) to smooth out phrasing. 10 min daily.',
    '2026-02-26 16:00:00+00', '2026-02-26 16:00:00+00'
  ),
  (
    '22222222-0000-0000-0000-000000000002',
    '2882ca6b-02ea-46ef-bc8b-e543d09b9101',
    '2026-02-12 15:00:00+00',
    'Vowel modification on high notes — introducing /ʌ/ shape above D5 to ease tension. Also covered soft palate lift exercises.',
    'Worked on the bridge of "Lover" — Nikoleta struggled with the sustained G5. Reduced dynamics help.',
    'Practise bridge of "Lover" quietly (mp) to reduce tension. Avoid belting for now.',
    '2026-02-12 16:00:00+00', '2026-02-12 16:00:00+00'
  ),
  (
    '22222222-0000-0000-0000-000000000002',
    '2882ca6b-02ea-46ef-bc8b-e543d09b9101',
    '2026-01-29 15:00:00+00',
    'Range assessment: C4–G5. Strong head voice, weaker chest register. Warm-up with lip trills and /ng/ hum.',
    'Chose "Lover" by Taylor Swift as first song. Light and well-suited to current range.',
    'Hum the melody of "Lover" once a day to internalise it before adding words.',
    '2026-01-29 16:00:00+00', '2026-01-29 16:00:00+00'
  );


-- ── 9. LESSONS — Boyan Angelov (Dimitar Emilov) ──────────────────────────────

insert into public.lessons (student_id, teacher_id, held_at, vocal_technique, song_notes, homework, created_at, updated_at)
values
  (
    '22222222-0000-0000-0000-000000000003',
    '2882ca6b-02ea-46ef-bc8b-e543d09b9101',
    '2026-02-27 17:00:00+00',
    'Staccato articulation on /da-da-da/ pattern across an octave. Boyan has good rhythmic sense — used this to improve pitch accuracy.',
    '"Levitating" is going well rhythmically. Pitch on the chorus hook needs attention — slightly flat on "You can fly away with me tonight".',
    'Sing the chorus of "Levitating" to a tuner app. Mark notes where you go flat.',
    '2026-02-27 18:00:00+00', '2026-02-27 18:00:00+00'
  ),
  (
    '22222222-0000-0000-0000-000000000003',
    '2882ca6b-02ea-46ef-bc8b-e543d09b9101',
    '2026-02-13 17:00:00+00',
    'Pitch training — singing back intervals (thirds, fifths) played on piano. Boyan struggles with minor thirds. Introduced melodic dictation.',
    'Introduced "Levitating" by Dua Lipa. Very enthusiastic about the song — energy is good, breath control is the priority.',
    'Clap the rhythm of the verse of "Levitating" before singing it. 5 min exercise daily.',
    '2026-02-13 18:00:00+00', '2026-02-13 18:00:00+00'
  ),
  (
    '22222222-0000-0000-0000-000000000003',
    '2882ca6b-02ea-46ef-bc8b-e543d09b9101',
    '2026-01-30 17:00:00+00',
    'First lesson. Range: C3–E4 (limited head voice access yet). Young student — focused on natural speaking voice and breath awareness.',
    'Discussed music preferences — Boyan likes Dua Lipa and Bruno Mars. Beginner-friendly songs shortlisted.',
    'Warm up by saying "mmm-hmmm" to a favourite song for 5 min each day.',
    '2026-01-30 18:00:00+00', '2026-01-30 18:00:00+00'
  );


-- ── 10. SONGS — Viktor Popov ──────────────────────────────────────────────────

insert into public.student_songs (student_id, teacher_id, song_name, song_url, lyrics_url, notes, status, created_at)
values
  (
    '22222222-0000-0000-0000-000000000001',
    '2882ca6b-02ea-46ef-bc8b-e543d09b9101',
    'Circles — Post Malone',
    'https://open.spotify.com/track/21jGcNKet2qwijlDFuPiPb',
    null,
    'Great match for Viktor''s lower register. Focus on vowel clarity in the verse.',
    'started',
    '2026-02-11 19:00:00+00'
  ),
  (
    '22222222-0000-0000-0000-000000000001',
    '2882ca6b-02ea-46ef-bc8b-e543d09b9101',
    'Golden Hour — JVKE',
    'https://open.spotify.com/track/5odlY52u43F5BjmOh1giUM',
    null,
    'Planned for after Circles. Good for chest-to-head voice blend.',
    'planned',
    '2026-02-25 19:30:00+00'
  );


-- ── 11. SONGS — Nikoleta Hristova ─────────────────────────────────────────────

insert into public.student_songs (student_id, teacher_id, song_name, song_url, lyrics_url, notes, status, created_at)
values
  (
    '22222222-0000-0000-0000-000000000002',
    '2882ca6b-02ea-46ef-bc8b-e543d09b9101',
    'Lover — Taylor Swift',
    'https://open.spotify.com/track/1dGr1c8CrMLDpV6mPbImSI',
    null,
    'Well-suited to Nikoleta''s range. Bridge needs particular attention on the G5.',
    'started',
    '2026-01-29 16:00:00+00'
  ),
  (
    '22222222-0000-0000-0000-000000000002',
    '2882ca6b-02ea-46ef-bc8b-e543d09b9101',
    'cardigan — Taylor Swift',
    'https://open.spotify.com/track/4R2kfaDFgnsg1s10JFQ5WZ',
    null,
    'Planned next — good lower register work to balance the head voice focus.',
    'planned',
    '2026-02-26 16:00:00+00'
  );


-- ── 12. SONGS — Boyan Angelov ─────────────────────────────────────────────────

insert into public.student_songs (student_id, teacher_id, song_name, song_url, lyrics_url, notes, status, created_at)
values
  (
    '22222222-0000-0000-0000-000000000003',
    '2882ca6b-02ea-46ef-bc8b-e543d09b9101',
    'Levitating — Dua Lipa',
    'https://open.spotify.com/track/39LLxExYz6ewLAcYrzQQyP',
    null,
    'Boyan loves this song — good motivation. Pitch accuracy on chorus is the focus.',
    'started',
    '2026-02-13 18:00:00+00'
  ),
  (
    '22222222-0000-0000-0000-000000000003',
    '2882ca6b-02ea-46ef-bc8b-e543d09b9101',
    'Uptown Funk — Mark Ronson ft. Bruno Mars',
    'https://open.spotify.com/track/32OlwWuMpZ6b0aN2RZOeMS',
    null,
    'Fun and rhythmic — planned for when breath control improves.',
    'planned',
    '2026-02-27 18:00:00+00'
  );
