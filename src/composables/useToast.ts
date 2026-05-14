import { ref, provide, inject, type Ref } from 'vue';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  duration: number;
}

const TOAST_KEY = Symbol('toast');

let nextId = 0;

export function createToast() {
  const toasts = ref<Toast[]>([]);

  const show = (message: string, type: 'success' | 'error' | 'info' = 'info', duration = 4000) => {
    const id = ++nextId;
    toasts.value.push({ id, message, type, duration });
    setTimeout(() => removeToast(id), duration + 300);
  };

  const removeToast = (id: number) => {
    toasts.value = toasts.value.filter(t => t.id !== id);
  };

  return { toasts, show, removeToast };
}

export function provideToast() {
  const ctx = createToast();
  provide(TOAST_KEY, ctx);
  return ctx;
}

export function useToast() {
  const ctx = inject<ReturnType<typeof createToast>>(TOAST_KEY);
  if (!ctx) {
    throw new Error('useToast() called without provideToast()');
  }
  return ctx;
}
