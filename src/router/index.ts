import { createRouter, createWebHistory } from 'vue-router'
import { API_URL } from '@/config/api'
import { supabase } from '@/lib/supabase'

const router = createRouter({
  history: createWebHistory((import.meta as any).env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: () => import('../views/Login.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/verify-email',
      name: 'email-verification',
      component: () => import('../views/EmailVerification.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/Dashboard.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/report',
      name: 'report',
      component: () => import('../views/Report.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/my-reports',
      name: 'my-reports',
      component: () => import('../views/MyReports.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/claim/:claimCode',
      name: 'claim',
      component: () => import('../views/Claim.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/item/:id',
      name: 'item-detail',
      component: () => import('../views/ItemDetail.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/scan',
      name: 'scanner',
      component: () => import('../views/Scanner.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('../views/Search.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/tutorial',
      name: 'tutorial',
      component: () => import('../views/Tutorial.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/developer',
      name: 'developer',
      component: () => import('../views/DeveloperView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/rating',
      name: 'rating',
      component: () => import('../views/Rating.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/statistics',
      name: 'statistics',
      component: () => import('../views/Statistics.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileEdit.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/profile/:username',
      name: 'profile-public',
      component: () => import('../views/ProfilePublic.vue')
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition && (to.name === 'dashboard' || to.name === 'search')) {
      return savedPosition
    }
    return { top: 0 }
  }
})

router.beforeEach(async (to, from, next) => {
  const { data: { session } } = await supabase.auth.getSession()
  const isAuthenticated = !!session

  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'login' })
  }

  if (to.meta.requiresAuth && isAuthenticated) {
    const emailVerified = session.user?.email_confirmed_at != null

    if (!emailVerified) {
      if (to.name !== 'email-verification') {
        return next({
          name: 'email-verification',
          query: { email: session.user.email }
        })
      }
      return next()
    }

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
    const emailVerified = session.user?.email_confirmed_at != null
    if (!emailVerified) {
      return next({
        name: 'email-verification',
        query: { email: session.user.email }
      })
    }
    return next({ name: 'dashboard' })
  }

  next()
})

export default router
