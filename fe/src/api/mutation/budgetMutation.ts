import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateBudget } from '../services/budgets';
import type { UpdateBudgetRequest } from '../../types';
import { monthlyBudgetQueryKeys } from '../queryKeys';

export const useUpdateBudgetMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateBudgetRequest) => updateBudget(data),
    onSuccess: () => {
      // 모든 예산 관련 쿼리 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: monthlyBudgetQueryKeys.all,
      });
    },
  });
};