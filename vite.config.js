import { defineConfig } from 'vite';

export default defineConfig({
  // Vite's default dev source map uses eval(), which browsers block under CSP.
  // 'cheap-module-source-map' gives the same line-level accuracy without eval.
  css: { devSourcemap: false },

  server: {
    headers: {
      // Allow eval only in dev — Vite's HMR client needs it.
      // Tighten this in production (build output has no HMR).
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
        "font-src 'self' https://cdn.jsdelivr.net",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net",
        "img-src 'self' data: blob:",
      ].join('; '),
    },
  },

  // Multi-Page Application: each HTML file is an entry point
  build: {
    rollupOptions: {
      input: {
        main:          'index.html',
        login:         'src/pages/login/login.html',
        dashboard:     'src/pages/dashboard/dashboard.html',
        students:      'src/pages/students/students.html',
        studentDetail: 'src/pages/students/student-detail.html',
        teachers:      'src/pages/teachers/teachers.html',
        announcements: 'src/pages/announcements/announcements.html',
        announcementDetail: 'src/pages/announcements/announcement-detail.html',
      },
    },
  },
});
