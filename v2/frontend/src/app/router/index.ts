import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

/**
 * Route-Definitionen
 * 
 * TODO: Implementiere alle Routes
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/features/identity/LoginView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/app/layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'overview',
        component: () => import('@/app/views/OverviewView.vue')
      },
      {
        path: 'patients',
        name: 'patients',
        component: () => import('@/features/patients/PatientListView.vue'),
        meta: { requiresModule: 'patients' }
      },
      {
        path: 'patients/create',
        name: 'patient-create',
        component: () => import('@/features/patients/PatientCreateView.vue'),
        meta: { requiresModule: 'patients' }
      },
      {
        path: 'patients/:id',
        name: 'patient-detail',
        component: () => import('@/features/patients/PatientDetailView.vue'),
        meta: { requiresModule: 'patients' }
      },
      {
        path: 'patients/:id/edit',
        name: 'patient-edit',
        component: () => import('@/features/patients/PatientEditView.vue'),
        meta: { requiresModule: 'patients' }
      },
      {
        path: 'calendar',
        name: 'calendar',
        component: () => import('@/app/views/CalendarView.vue')
      },
      {
        path: 'admin',
        name: 'admin',
        component: () => import('@/app/views/AdminView.vue')
      },
      {
        path: 'ki-test',
        name: 'ki-test',
        component: () => import('@/app/views/KiTestView.vue')
      }
    ]
  }
];

export const router = createRouter({
  history: createWebHistory(),
  routes
});

// Navigation Guards
router.beforeEach((_to, _from, next) => {
  // TODO: Auth & Feature Gate Checks
  next();
});

