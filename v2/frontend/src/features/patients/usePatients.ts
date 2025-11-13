import { computed, type Ref } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { patientApi } from '@/services/api';
import { queryKeys } from '@/services/query-keys';

/**
 * usePatients Composable
 * 
 * Verwaltet Patienten-Liste via Vue Query
 */
export function usePatients(tenantId: Ref<string> | string, search?: Ref<string> | string) {
  const tenantIdValue = typeof tenantId === 'string' ? tenantId : tenantId.value;
  const searchValue = search ? (typeof search === 'string' ? search : search.value) : undefined;
  
  const query = useQuery({
    queryKey: computed(() => queryKeys.patients(tenantIdValue, searchValue)),
    queryFn: () => patientApi.getPatients(tenantIdValue, searchValue),
    enabled: !!tenantIdValue,
    staleTime: 2 * 60 * 1000 // 2 Minuten
  });
  
  return {
    patients: computed(() => query.data.value?.patients || []),
    total: computed(() => query.data.value?.total || 0),
    isLoading: computed(() => query.isLoading.value),
    isError: computed(() => query.isError.value),
    error: query.error,
    refetch: query.refetch
  };
}

