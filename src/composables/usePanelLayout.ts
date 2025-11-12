import { computed, reactive } from 'vue';

export type PanelId = 'nav' | 'main' | 'context';

export type PanelConfig = {
  id: PanelId;
  flexBasis: number; // in Prozent (0-100)
  minFlexBasis: number; // in Prozent
  maxFlexBasis: number; // in Prozent
  order: number;
  minimized: boolean;
};

type PanelLayoutState = {
  panels: Record<PanelId, PanelConfig>;
  order: PanelId[];
};

const STORAGE_KEY = 'sensarion-panel-layout';

const defaultPanels: Record<PanelId, PanelConfig> = {
  nav: {
    id: 'nav',
    flexBasis: 20, // 20% der verfügbaren Breite
    minFlexBasis: 10,
    maxFlexBasis: 40,
    order: 0,
    minimized: false
  },
  main: {
    id: 'main',
    flexBasis: 60, // 60% der verfügbaren Breite (flex: 1 wird verwendet)
    minFlexBasis: 30,
    maxFlexBasis: 100,
    order: 1,
    minimized: false
  },
  context: {
    id: 'context',
    flexBasis: 20, // 20% der verfügbaren Breite
    minFlexBasis: 10,
    maxFlexBasis: 40,
    order: 2,
    minimized: false
  }
};

const defaultOrder: PanelId[] = ['nav', 'main', 'context'];

const state = reactive<PanelLayoutState>({
  panels: { ...defaultPanels },
  order: [...defaultOrder]
});

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as PanelLayoutState;
    
    // Merge mit defaults für neue Properties
    // Migration: Wenn width vorhanden ist, konvertiere zu flexBasis
    const migratePanel = (oldPanel: any, defaultPanel: PanelConfig): PanelConfig => {
      if (oldPanel.width !== undefined && oldPanel.flexBasis === undefined) {
        // Migration: Alte Pixel-Werte ignorieren, Defaults verwenden
        return { ...defaultPanel };
      }
      return { ...defaultPanel, ...oldPanel };
    };
    
    state.panels = {
      nav: migratePanel(parsed.panels?.nav, defaultPanels.nav),
      main: migratePanel(parsed.panels?.main, defaultPanels.main),
      context: migratePanel(parsed.panels?.context, defaultPanels.context)
    };
    
    state.order = parsed.order || [...defaultOrder];
  } catch (error) {
    console.warn('Konnte Panel-Layout nicht auslesen', error);
  }
};

const persist = () => {
  const payload: PanelLayoutState = {
    panels: { ...state.panels },
    order: [...state.order]
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

loadFromStorage();

export const usePanelLayout = () => {
  const getPanel = (id: PanelId): PanelConfig => {
    return state.panels[id];
  };

  const setPanelFlexBasis = (id: PanelId, flexBasis: number) => {
    const panel = state.panels[id];
    if (!panel) return;
    
    const clampedFlexBasis = Math.max(panel.minFlexBasis, Math.min(panel.maxFlexBasis, flexBasis));
    panel.flexBasis = clampedFlexBasis;
    persist();
  };

  // Legacy support für setPanelWidth (wird zu setPanelFlexBasis konvertiert)
  const setPanelWidth = (id: PanelId, width: number) => {
    // Diese Funktion wird nicht mehr verwendet, aber für Kompatibilität behalten
    console.warn('setPanelWidth is deprecated, use setPanelFlexBasis instead');
  };

  const toggleMinimize = (id: PanelId) => {
    const panel = state.panels[id];
    if (!panel) return;
    
    panel.minimized = !panel.minimized;
    persist();
  };

  const minimizePanel = (id: PanelId) => {
    const panel = state.panels[id];
    if (!panel) return;
    
    panel.minimized = true;
    persist();
  };

  const restorePanel = (id: PanelId) => {
    const panel = state.panels[id];
    if (!panel) return;
    
    panel.minimized = false;
    persist();
  };

  const reorderPanels = (newOrder: PanelId[]) => {
    state.order = [...newOrder];
    
    // Update order property in panels
    newOrder.forEach((id, index) => {
      if (state.panels[id]) {
        state.panels[id].order = index;
      }
    });
    
    persist();
  };

  const movePanel = (fromIndex: number, toIndex: number) => {
    const newOrder = [...state.order];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);
    reorderPanels(newOrder);
  };

  const minimizedPanels = computed(() => {
    return state.order.filter(id => state.panels[id]?.minimized);
  });

  const visiblePanels = computed(() => {
    return state.order.filter(id => !state.panels[id]?.minimized);
  });

  const getOrderedPanels = computed(() => {
    return state.order.map(id => state.panels[id]).filter(Boolean);
  });

  // Legacy support für bestehende Komponenten
  const sidebarCollapsed = computed(() => state.panels.nav.minimized);
  const contextCollapsed = computed(() => state.panels.context.minimized);

  const toggleSidebar = () => {
    toggleMinimize('nav');
  };

  const toggleContext = () => {
    toggleMinimize('context');
  };

  return {
    state,
    getPanel,
    setPanelFlexBasis,
    setPanelWidth, // Legacy support
    toggleMinimize,
    minimizePanel,
    restorePanel,
    reorderPanels,
    movePanel,
    minimizedPanels,
    visiblePanels,
    getOrderedPanels,
    // Legacy support
    sidebarCollapsed,
    contextCollapsed,
    toggleSidebar,
    toggleContext
  };
};

