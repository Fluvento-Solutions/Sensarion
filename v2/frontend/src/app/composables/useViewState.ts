import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';

export type ViewType = 'overview' | 'patients' | 'calendar' | 'admin' | 'ki-test';

const activeView = ref<ViewType>('overview');

export function useViewState() {
  const router = useRouter();
  const route = useRoute();

  // Synchronisiere activeView mit Router
  watch(() => route.name, (routeName) => {
    if (routeName === 'patients' || routeName === 'patient-detail' || routeName === 'patient-create' || routeName === 'patient-edit') {
      activeView.value = 'patients';
    } else if (routeName === 'admin') {
      activeView.value = 'admin';
    } else if (routeName === 'calendar') {
      activeView.value = 'calendar';
    } else if (routeName === 'ki-test') {
      activeView.value = 'ki-test';
    } else if (routeName === 'overview') {
      activeView.value = 'overview';
    }
  }, { immediate: true });

  const setActiveView = (view: ViewType) => {
    activeView.value = view;
    
    // Router-Navigation basierend auf View
    switch (view) {
      case 'patients':
        router.push({ name: 'patients' });
        break;
      case 'admin':
        router.push({ name: 'admin' });
        break;
      case 'calendar':
        router.push({ name: 'calendar' });
        break;
      case 'ki-test':
        router.push({ name: 'ki-test' });
        break;
      case 'overview':
      default:
        router.push({ name: 'overview' });
        break;
    }
  };

  return {
    activeView: computed(() => activeView.value),
    setActiveView
  };
}

