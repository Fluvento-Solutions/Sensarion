import { computed, reactive } from 'vue';

type SidebarState = {
  sidebarCollapsed: boolean;
  contextCollapsed: boolean;
};

const STORAGE_KEY = 'sensarion-sidebar-state';

const state = reactive<SidebarState>({
  sidebarCollapsed: false,
  contextCollapsed: false
});

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as SidebarState;
    state.sidebarCollapsed = parsed.sidebarCollapsed ?? false;
    state.contextCollapsed = parsed.contextCollapsed ?? false;
  } catch (error) {
    console.warn('Konnte Sidebar-State nicht auslesen', error);
  }
};

const persist = () => {
  const payload: SidebarState = {
    sidebarCollapsed: state.sidebarCollapsed,
    contextCollapsed: state.contextCollapsed
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

loadFromStorage();

export const useSidebarState = () => {
  const toggleSidebar = () => {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    persist();
  };

  const toggleContext = () => {
    state.contextCollapsed = !state.contextCollapsed;
    persist();
  };

  return {
    state,
    toggleSidebar,
    toggleContext
  };
};

