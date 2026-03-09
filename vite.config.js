import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    headers: {
      // Allow eval only in dev (Vite HMR requires it).
      // Covers all external resources the app loads.
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data:",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
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
        profile:      'src/pages/profile/profile.html',
        setPassword:  'src/pages/auth/set-password.html',
      },
    },
  },
});
