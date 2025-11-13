import { computed } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { patientApi, type Patient, type UpdatePatientDTO } from '@/services/api';
import { queryKeys } from '@/services/query-keys';

import type { Ref } from 'vue';

/**
 * usePatient Composable
 * 
 * Verwaltet Patient-Daten via Vue Query
 */
export function usePatient(patientId: Ref<string> | string, tenantId: Ref<string> | string) {
  const queryClient = useQueryClient();
  
  const patientIdValue = typeof patientId === 'string' ? patientId : patientId.value;
  const tenantIdValue = typeof tenantId === 'string' ? tenantId : tenantId.value;
  
  // Query: Lade Patient
  const query = useQuery({
    queryKey: queryKeys.patient(patientIdValue, tenantIdValue),
    queryFn: () => patientApi.getPatient(patientIdValue, tenantIdValue),
    enabled: !!patientIdValue && !!tenantIdValue,
    staleTime: 5 * 60 * 1000 // 5 Minuten
  });
  
  // Mutation: Update Patient
  const mutation = useMutation({
    mutationFn: ({ data, version }: { data: UpdatePatientDTO; version: number }) =>
      patientApi.updatePatient(patientIdValue, data, version),
    onMutate: async (newData) => {
      // Optimistic Update
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.patient(patientIdValue, tenantIdValue) 
      });
      
      const previousPatient = queryClient.getQueryData<Patient>(
        queryKeys.patient(patientIdValue, tenantIdValue)
      );
      
      queryClient.setQueryData<Patient>(
        queryKeys.patient(patientIdValue, tenantIdValue),
        (old) => old ? { ...old, ...newData.data, version: newData.version + 1 } : undefined
      );
      
      return { previousPatient };
    },
    onError: (_error, _newData, context) => {
      // Rollback
      if (context?.previousPatient) {
        queryClient.setQueryData(
          queryKeys.patient(patientIdValue, tenantIdValue),
          context.previousPatient
        );
      }
    },
    onSuccess: () => {
      // Invalidate Cache
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.patient(patientIdValue, tenantIdValue) 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['patients', tenantIdValue] as const
      });
    }
  });
  
  return {
    // Query
    patient: query.data,
    isLoading: computed(() => query.isLoading.value),
    isError: computed(() => query.isError.value),
    error: query.error,
    refetch: query.refetch,
    
    // Mutation
    update: (data: UpdatePatientDTO, version: number) => mutation.mutate({ data, version }),
    updateAsync: (data: UpdatePatientDTO, version: number) => mutation.mutateAsync({ data, version }),
    isUpdating: computed(() => mutation.isPending.value),
    updateError: mutation.error
  };
}

