import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateBudget } from '../services/budgets';
import type { UpdateBudgetRequest } from '../../types';
import { monthlyBudgetQueryKeys } from '../queryKeys';

export const useUpdateBudgetMutation = (year: number, month: number, onMutationComplete?: (budgetId: number) => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateBudgetRequest) => updateBudget(data),
    onMutate: async (variables) => {
      const { budgetId, budget: newBudget } = variables;

      const queryKey = monthlyBudgetQueryKeys.monthly(year, month);

      // 진행 중인 쿼리들 취소
      await queryClient.cancelQueries({ queryKey });

      // 이전 데이터 스냅샷 저장
      const previousData = queryClient.getQueryData(queryKey);

      // 낙관적 업데이트
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;

        return old.map((item: any) =>
          item.id === budgetId
            ? { ...item, budget: newBudget }
            : item
        );
      });

      return { previousData, queryKey };
    },
    onError: (_err, variables, context) => {
      // 에러 시 이전 데이터로 롤백
      if (context?.previousData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
      // pending 상태 정리
      if (onMutationComplete) {
        onMutationComplete(variables.budgetId);
      }
    },
    onSuccess: (_data, variables) => {
      // 성공 시 서버 응답으로 캐시 업데이트 (선택적)
      // 이미 낙관적 업데이트가 적용되어 있으므로 추가 작업 없음

      // pending 상태 정리
      if (onMutationComplete) {
        onMutationComplete(variables.budgetId);
      }
    },
    onSettled: () => {
      // 필요한 경우에만 특정 쿼리 재검증
      // queryClient.invalidateQueries({ queryKey: monthlyBudgetQueryKeys.all });
    },
  });
};