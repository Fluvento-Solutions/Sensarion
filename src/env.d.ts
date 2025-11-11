/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, any>;
  export default component;
}

declare module '@/components/layout/AppShell.vue' {
  import type { DefineComponent, SlotsType, VNode } from 'vue';

  type AppShellSlotFns = {
    header?: () => VNode[];
    sidebar?: () => VNode[];
    default?: () => VNode[];
    context?: () => VNode[];
    footer?: () => VNode[];
  };

  const component: DefineComponent<{}, {}, {}, {}, {}, {}, {}, {}, {}, SlotsType<AppShellSlotFns>>;
  export default component;
}

