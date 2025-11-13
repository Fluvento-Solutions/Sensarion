import { computed, reactive } from 'vue';

export type ViewType = 'overview' | 'ki-test' | 'patients' | 'calendar' | 'admin';

export type OllamaModel = 'gemma3:12b';

type ViewState = {
  activeView: ViewType;
  kiTestContext: string;
  kiTestResult: string;
  selectedModel: OllamaModel;
};

const STORAGE_KEY = 'sensarion-view-state';

const defaultState: ViewState = {
  activeView: 'overview',
  kiTestContext: '',
  kiTestResult: '',
  selectedModel: 'gemma3:12b'
};

const state = reactive<ViewState>({ ...defaultState });

// Load from localStorage
const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<ViewState>;
    if (parsed.activeView) {
      state.activeView = parsed.activeView;
    }
    if (parsed.kiTestContext !== undefined) {
      state.kiTestContext = parsed.kiTestContext;
    }
    if (parsed.selectedModel) {
      state.selectedModel = parsed.selectedModel;
    }
  } catch (error) {
    console.warn('Konnte View-State nicht auslesen', error);
  }
};

// Persist to localStorage
const persist = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      activeView: state.activeView,
      kiTestContext: state.kiTestContext,
      selectedModel: state.selectedModel
    }));
  } catch (error) {
    console.warn('Konnte View-State nicht speichern', error);
  }
};

loadFromStorage();

export const useViewState = () => {
  const setActiveView = (view: ViewType) => {
    state.activeView = view;
    persist();
  };

  const setKiTestContext = (context: string) => {
    state.kiTestContext = context;
    persist();
  };

  const setKiTestResult = (result: string) => {
    state.kiTestResult = result;
  };

  return {
    activeView: computed(() => state.activeView),
    kiTestContext: computed(() => state.kiTestContext),
    kiTestResult: computed(() => state.kiTestResult),
    selectedModel: computed(() => state.selectedModel),
    setActiveView,
    setKiTestContext,
    setKiTestResult
  };
};

