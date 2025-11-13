import { computed, reactive } from 'vue';
import { defineStore } from 'pinia';
import type { User } from './types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
}

const STORAGE_KEY = 'sensarion-auth';

/**
 * Auth Store (Pinia)
 * 
 * Verwaltet Client-State für Authentifizierung
 */
export const useAuthStore = defineStore('auth', () => {
  const state = reactive<AuthState>({
    accessToken: null,
    refreshToken: null,
    user: null
  });
  
  // Load from localStorage
  const loadFromStorage = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AuthState;
      state.accessToken = parsed.accessToken;
      state.refreshToken = parsed.refreshToken;
      state.user = parsed.user;
    } catch (error) {
      console.warn('Could not load session from storage:', error);
    }
  };
  
  // Persist to localStorage
  const persist = () => {
    const payload: AuthState = {
      accessToken: state.accessToken,
      refreshToken: state.refreshToken,
      user: state.user
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  };
  
  loadFromStorage();
  
  const isAuthenticated = computed(() => !!state.accessToken && !!state.user);
  
  const setSession = (accessToken: string, refreshToken: string, user: User) => {
    state.accessToken = accessToken;
    state.refreshToken = refreshToken;
    state.user = user;
    persist();
  };
  
  const clearSession = () => {
    state.accessToken = null;
    state.refreshToken = null;
    state.user = null;
    localStorage.removeItem(STORAGE_KEY);
  };
  
  return {
    state,
    isAuthenticated,
    setSession,
    clearSession
  };
});

