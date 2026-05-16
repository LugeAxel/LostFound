import { createRouter, createWebHistory } from 'vue-router'
import { API_URL } from '@/config/api'
import { supabase } from '@/lib/supabase'
import Login from '../views/Login.vue'
import EmailVerification from '../views/EmailVerification.vue'
import Dashboard from '../views/Dashboard.vue'
import Report from '../views/Report.vue'
import MyReports from '../views/MyReports.vue'
import Claim from '../views/Claim.vue'
import ItemDetail from '../views/ItemDetail.vue'
import Scanner from '../views/Scanner.vue'
import Search from '../views/Search.vue'
import Tutorial from '../views/Tutorial.vue'
import DeveloperView from '../views/DeveloperView.vue'
import Rating from '../views/Rating.vue'
import Statistics from '../views/Statistics.vue'

const router = createRouter({
  history: createWebHistory((import.meta as any).env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: Login,
      meta: { requiresGuest: true }
    },
    {
      path: '/verify-email',
      name: 'email-verification',
      component: EmailVerification,
      // No meta guards — accessible regardless of auth state.
      // Supabase auto-processes URL hash tokens during client init,
      // so by the time the router guard runs the hash is already cleared
      // and a session exists. Removing requiresGuest lets the component
      // mount and handle all scenarios (auto-verified, manual, pending).
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: Dashboard,
      meta: { requiresAuth: true }
    },
    {
      path: '/report',
      name: 'report',
      component: Report,
      meta: { requiresAuth: true }
    },
    {
      path: '/my-reports',
      name: 'my-reports',
      component: MyReports,
      meta: { requiresAuth: true }
    },
    {
      path: '/claim/:id',
      name: 'claim',
      component: Claim,
      meta: { requiresAuth: true }
    },
    {
      path: '/item/:id',
      name: 'item-detail',
      component: ItemDetail,
      meta: { requiresAuth: true }
    },
    {
      path: '/scan',
      name: 'scanner',
      component: Scanner,
      meta: { requiresAuth: true }
    },
    {
      path: '/search',
      name: 'search',
      component: Search,
      meta: { requiresAuth: true }
    },
    {
      path: '/tutorial',
      name: 'tutorial',
      component: Tutorial,
      meta: { requiresAuth: true }
    },
    {
      path: '/developer',
      name: 'developer',
      component: DeveloperView,
      meta: { requiresAuth: true }
    },
    {
      path: '/rating',
      name: 'rating',
      component: Rating,
      meta: { requiresAuth: true }
    },
    {
      path: '/statistics',
      name: 'statistics',
      component: Statistics,
      meta: { requiresAuth: true }
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ],
})

router.beforeEach(async (to, from, next) => {
  const { data: { session } } = await supabase.auth.getSession()
  const isAuthenticated = !!session

  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'login' })
  }

  if (to.meta.requiresAuth && isAuthenticated) {
    if (!from.name) {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })

        if (!response.ok) {
          await supabase.auth.signOut()
          return next({ name: 'login' })
        }
      } catch {
        // Network error — allow navigation
      }
    }
  }

  if (to.meta.requiresGuest && isAuthenticated) {
    return next({ name: 'dashboard' })
  }

  next()
})

export default router
