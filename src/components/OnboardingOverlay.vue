<script setup lang="ts">
import { ref, computed } from 'vue'
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'
import { useI18n, type Locale } from '../i18n'

const { t, locale } = useI18n()
const emit = defineEmits<{ close: [] }>()

const currentPage = ref(0)
const celebrateActive = ref(false)
const closing = ref(false)
const sparkles = ref<Array<{id:number, tx:number, ty:number, delay:number, size:number}>>([])

const ripples = [
  { id: 1, color: 'rgba(56,123,65,1)', scale: 90, delay: 0 },
  { id: 2, color: 'rgba(34,197,94,1)', scale: 70, delay: 0.06 },
  { id: 3, color: 'rgba(255,255,255,1)', scale: 50, delay: 0.12 },
]

const totalPages = 4

const selectLanguage = (lang: Locale) => {
  locale.value = lang
  localStorage.setItem('locale', lang)
  advance()
}

const triggerCelebration = () => {
  const items = []
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6
    const dist = 60 + Math.random() * 90
    items.push({
      id: i,
      tx: Math.cos(angle) * dist,
      ty: Math.sin(angle) * dist,
      delay: Math.random() * 0.15,
      size: 5 + Math.random() * 5,
    })
  }
  sparkles.value = items
  celebrateActive.value = true
}

const advance = () => {
  if (currentPage.value === 0) {
    currentPage.value++
    return
  }

  triggerCelebration()

  if (currentPage.value < totalPages - 1) {
    setTimeout(() => {
      currentPage.value++
    }, 280)
    setTimeout(() => {
      celebrateActive.value = false
      sparkles.value = []
    }, 700)
  } else {
    setTimeout(() => {
      celebrateActive.value = false
      sparkles.value = []
      closing.value = true
    }, 600)
    setTimeout(() => {
      localStorage.setItem('onboarding_seen', 'true')
      emit('close')
    }, 900)
  }
}

const requestPushPermission = async () => {
  if (!('Notification' in window)) {
    advance()
    return
  }
  const result = await Notification.requestPermission()
  advance()
}

const skip = () => {
  localStorage.setItem('onboarding_seen', 'true')
  emit('close')
}

const dots = computed(() => Array.from({ length: totalPages }, (_, i) => i))

const particles = Array.from({ length: 14 }, () => {
  const size = 4 + Math.random() * 10
  return {
    size,
    left: `${5 + Math.random() * 90}%`,
    top: `${5 + Math.random() * 90}%`,
    color: ['rgba(255,255,255,0.15)', 'rgba(56,123,65,0.12)', 'rgba(139,92,246,0.1)'][Math.floor(Math.random() * 3)],
    duration: `${4 + Math.random() * 5}s`,
    delay: `${Math.random() * 6}s`,
    dx: `${-20 + Math.random() * 40}px`,
    dy: `${-40 + Math.random() * -20}px`,
    blur: size > 8 ? 'blur(1px)' : 'none',
  }
})
</script>

<template>
  <div :class="['fixed inset-0 z-[100] flex items-center justify-center overflow-hidden transition-all duration-[350ms]', closing ? 'opacity-0' : '']">
    <!-- Animated background -->
    <div :class="['absolute inset-0 transition-all duration-[350ms]', closing ? 'opacity-0 backdrop-blur-none' : 'bg-black/60 backdrop-blur-sm']"></div>
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-[#387b41] opacity-[0.08] blur-[100px] animate-bgDrift1"></div>
      <div class="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-[#8b5cf6] opacity-[0.06] blur-[100px] animate-bgDrift2"></div>
    </div>

    <!-- Card -->
    <div :class="['relative w-full max-w-md mx-4 bg-white dark:bg-[#1e1e1e] rounded-[2rem] shadow-2xl border border-[#e0e4df] dark:border-[#374151] overflow-hidden transition-all duration-[350ms]', closing ? 'scale-90 opacity-0' : '']" @click.stop>
      <div class="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <span v-for="(p, i) in particles" :key="i"
          class="absolute rounded-full"
          :style="{
            width: p.size + 'px', height: p.size + 'px',
            left: p.left, top: p.top,
            background: p.color,
            filter: p.blur,
            animation: `particleFloat ${p.duration} ${p.delay}s ease-in-out infinite`,
            '--dx': p.dx, '--dy': p.dy
          }">
        </span>
      </div>

      <!-- Celebration overlay (Duolingo style) -->
      <div v-if="celebrateActive" class="absolute inset-0 pointer-events-none z-20" aria-hidden="true">
        <!-- Expanding circles (ripple effect) -->
        <span v-for="r in ripples" :key="r.id"
          class="ripple-circle"
          :style="{
            background: r.color,
            animationDelay: r.delay + 's',
            '--scale': r.scale,
          }">
        </span>
        <!-- Diamond sparkles floating upward -->
        <span v-for="s in sparkles" :key="s.id"
          class="celebration-sparkle"
          :style="{
            width: s.size + 'px', height: s.size + 'px',
            animationDelay: s.delay + 's',
            '--tx': s.tx + 'px', '--ty': s.ty + 'px',
          }">
        </span>
      </div>

      <div class="p-8 sm:p-10">
        <!-- Page content with Vue Transition -->
        <Transition name="page" mode="out-in">
          <div :key="currentPage" class="flex flex-col items-center text-center min-h-[320px] justify-between w-full">

            <!-- Page 0: Language Selector -->
            <div v-if="currentPage === 0" class="flex flex-col items-center text-center w-full">
              <div class="w-24 h-24 rounded-full bg-[#f0fdf4] dark:bg-[#1a3a1a] flex items-center justify-center mb-6 animate-float">
                <span class="material-symbols-outlined text-5xl text-[#387b41]">language</span>
              </div>
              <h2 class="text-xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-6">{{ t('onboarding.p0_title') }}</h2>
              <div class="w-full space-y-3 mb-8">
                <button @click="selectLanguage('en')"
                  class="w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 border-[#e0e4df] dark:border-[#374151] bg-white dark:bg-[#2a2a2a] hover:border-[#387b41] hover:bg-[#f0fdf4] dark:hover:bg-[#1a3a1a] hover:shadow-lg active:scale-[0.97] transition-all duration-[250ms] ease-out group">
                  <span class="text-2xl">🇬🇧</span>
                  <span class="text-base font-bold text-[#1c1b1b] dark:text-[#f3f4f6] group-hover:text-[#387b41] transition-colors">{{ t('onboarding.p0_en') }}</span>
                </button>
                <button @click="selectLanguage('id')"
                  class="w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 border-[#e0e4df] dark:border-[#374151] bg-white dark:bg-[#2a2a2a] hover:border-[#387b41] hover:bg-[#f0fdf4] dark:hover:bg-[#1a3a1a] hover:shadow-lg active:scale-[0.97] transition-all duration-[250ms] ease-out group">
                  <span class="text-2xl">🇮🇩</span>
                  <span class="text-base font-bold text-[#1c1b1b] dark:text-[#f3f4f6] group-hover:text-[#387b41] transition-colors">{{ t('onboarding.p0_id') }}</span>
                </button>
              </div>
            </div>

            <!-- Page 1 -->
            <div v-else-if="currentPage === 1" class="w-full">
              <div class="w-full flex justify-center mb-6 animate-float">
                <DotLottieVue src="/animations/onboarding-purpose.json" :autoplay="true" :loop="true" :speed="0.8" style="width:160px;height:160px" class="mx-auto" />
              </div>
              <h2 class="text-xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-3">{{ t('onboarding.p1_title') }}</h2>
              <p class="text-sm text-[#40493d] dark:text-[#9ca3af] leading-relaxed">{{ t('onboarding.p1_desc') }}</p>
              <div class="w-full mt-6">
                <button @click="advance"
                  class="onboarding-cta w-full px-6 py-3.5 rounded-xl font-bold text-white shadow-lg hover:shadow-[0_8px_28px_rgba(56,123,65,0.35)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 ease-out">
                  {{ t('onboarding.p1_cta') }}
                </button>
              </div>
            </div>

            <!-- Page 2 -->
            <div v-else-if="currentPage === 2" class="w-full">
              <div class="w-full flex justify-center mb-6 animate-float">
                <DotLottieVue src="/animations/onboarding-how.json" :autoplay="true" :loop="true" :speed="1" style="width:160px;height:160px" class="mx-auto" />
              </div>
              <h2 class="text-xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-3">{{ t('onboarding.p2_title') }}</h2>
              <p class="text-sm text-[#40493d] dark:text-[#9ca3af] leading-relaxed whitespace-pre-line">{{ t('onboarding.p2_desc') }}</p>
              <div class="w-full mt-6">
                <button @click="advance"
                  class="onboarding-cta w-full px-6 py-3.5 rounded-xl font-bold text-white shadow-lg hover:shadow-[0_8px_28px_rgba(56,123,65,0.35)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 ease-out">
                  {{ t('onboarding.p2_cta') }}
                </button>
              </div>
            </div>

            <!-- Page 3: Push Notification Permission -->
            <div v-else class="w-full">
              <div class="w-20 h-20 rounded-full bg-[#e0f2fe] dark:bg-[#0c4a6e] flex items-center justify-center mb-4 animate-float mx-auto">
                <span class="material-symbols-outlined text-5xl text-[#0ea5e9]">notifications_active</span>
              </div>
              <h2 class="text-xl font-bold text-[#1c1b1b] dark:text-[#f3f4f6] mb-3">{{ t('onboarding.p3_title') }}</h2>
              <p class="text-sm text-[#40493d] dark:text-[#9ca3af] leading-relaxed mb-6">{{ t('onboarding.p3_desc') }}</p>
              <div class="w-full space-y-3">
                <button @click="requestPushPermission"
                  class="onboarding-cta w-full px-6 py-3.5 rounded-xl font-bold text-white shadow-lg hover:shadow-[0_8px_28px_rgba(56,123,65,0.35)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 ease-out">
                  {{ t('onboarding.p3_cta') }}
                </button>
                <button @click="skip"
                  class="w-full text-sm font-bold text-[#40493d] dark:text-[#9ca3af] hover:text-[#387b41] transition-colors py-2">
                  {{ t('onboarding.p3_skip') }}
                </button>
              </div>
            </div>

          </div>
        </Transition>

        <!-- Dots indicator (all pages, visual only) -->
        <div class="flex justify-center gap-2 mt-6">
          <span v-for="i in dots" :key="i"
            :class="['rounded-full transition-all duration-300',
              currentPage === i
                ? 'bg-[#387b41] w-6 h-2 animate-pulseRing'
                : 'bg-[#d1d5db] dark:bg-[#4b5563] w-2 h-2']">
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-bgDrift1 {
  animation: bgDrift1 8s ease-in-out infinite;
}
.animate-bgDrift2 {
  animation: bgDrift2 10s ease-in-out infinite;
}
@keyframes bgDrift1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(3%, -2%) scale(1.05); }
  66% { transform: translate(-2%, 1%) scale(0.95); }
}
@keyframes bgDrift2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-3%, 2%) scale(0.95); }
  66% { transform: translate(2%, -1%) scale(1.05); }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
}

.onboarding-cta {
  background: linear-gradient(135deg, #387b41, #2d6334, #1b6d24);
  background-size: 200% 200%;
  animation: gradientShift 4s ease infinite;
}
@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

/* ── Duolingo-style celebration ── */
.ripple-circle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(0);
  animation: rippleGrow 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  pointer-events: none;
}
@keyframes rippleGrow {
  0% { transform: translate(-50%, -50%) scale(0); opacity: 0.85; }
  100% { transform: translate(-50%, -50%) scale(var(--scale)); opacity: 0; }
}

.celebration-sparkle {
  position: absolute;
  top: 50%;
  left: 50%;
  background: #22c55e;
  border-radius: 1px;
  transform: translate(-50%, -50%) rotate(45deg);
  animation: sparkleRise 0.65s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
  pointer-events: none;
}
@keyframes sparkleRise {
  0% { transform: translate(-50%, -50%) rotate(45deg) scale(1); opacity: 1; }
  100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) rotate(45deg) scale(0.15); opacity: 0; }
}

/* ── Page transitions ── */
.page-enter-active {
  animation: enterPage 320ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.page-leave-active {
  animation: leavePage 180ms ease-in forwards;
}
@keyframes enterPage {
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes leavePage {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0.92); opacity: 0; }
}

/* ── Background floating particles ── */
@keyframes particleFloat {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0; }
  15% { opacity: 1; }
  85% { opacity: 0.5; }
  100% { transform: translate(var(--dx), var(--dy)) scale(0.3); opacity: 0; }
}

.animate-pulseRing {
  animation: pulseRing 2s ease-in-out infinite;
}
@keyframes pulseRing {
  0% { box-shadow: 0 0 0 0 rgba(56, 123, 65, 0.3); }
  70% { box-shadow: 0 0 0 6px rgba(56, 123, 65, 0); }
  100% { box-shadow: 0 0 0 0 rgba(56, 123, 65, 0); }
}

@media (prefers-reduced-motion: reduce) {
  .animate-bgDrift1,
  .animate-bgDrift2,
  .animate-float,
  .animate-pulseRing,
  .onboarding-cta,
  .ripple-circle,
  .celebration-sparkle,
  [style*="particleFloat"],
  * {
    animation: none !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }
}
</style>