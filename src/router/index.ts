import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'
import Report from '../views/Report.vue'
import MyReports from '../views/MyReports.vue'
import Claim from '../views/Claim.vue'
import ItemDetail from '../views/ItemDetail.vue'
import Scanner from '../views/Scanner.vue'

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
    // Catch-all: redirect unknown routes to login
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ],
})

// Navigation guard: protect routes
router.beforeEach(async (to, from, next) => {
  const token = localStorage.getItem('token')
  const user = localStorage.getItem('user')
  const isAuthenticated = !!token && !!user

  if (to.meta.requiresAuth && !isAuthenticated) {
    // Not logged in → redirect to login
    return next({ name: 'login' })
  }

  if (to.meta.requiresAuth && isAuthenticated) {
    // Verify token is still valid by calling /api/auth/me
    try {
      const apiUrl = (import.meta as any).env.VITE_API_URL
      const response = await fetch(`${apiUrl}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        // Token expired or invalid → clear and redirect
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        return next({ name: 'login' })
      }
    } catch {
      // Network error — allow navigation but token may fail later
      // Don't block the user if backend is temporarily down
    }
  }

  if (to.meta.requiresGuest && isAuthenticated) {
    // Already logged in → redirect to dashboard
    return next({ name: 'dashboard' })
  }

  next()
})

export default router
