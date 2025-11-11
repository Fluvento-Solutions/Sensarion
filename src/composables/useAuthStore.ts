import { computed, reactive } from 'vue';

import type { UserProfile } from '@/services/api';

type SessionState = {
  token: string | null;
  user: UserProfile | null;
};

const STORAGE_KEY = 'sensarion-auth';

const state = reactive<SessionState>({
  token: null,
  user: null
});

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as SessionState;
    state.token = parsed.token;
    state.user = parsed.user;
  } catch (error) {
    console.warn('Konnte Session nicht auslesen', error);
  }
};

const persist = () => {
  const payload: SessionState = {
    token: state.token,
    user: state.user
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

loadFromStorage();

export const useAuthStore = () => {
  const isAuthenticated = computed(() => !!state.token && !!state.user);

  const setSession = (token: string, user: UserProfile) => {
    state.token = token;
    state.user = user;
    persist();
  };

  const clearSession = () => {
    state.token = null;
    state.user = null;
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    state,
    isAuthenticated,
    setSession,
    clearSession
  };
};

