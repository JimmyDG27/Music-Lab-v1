import { defineConfig } from 'vite';

export default defineConfig({
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
