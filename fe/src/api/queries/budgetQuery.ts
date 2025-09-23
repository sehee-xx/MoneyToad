import { useQuery } from '@tanstack/react-query';
import { getMonthlyBudgets } from '../services/budgets';
import { monthlyBudgetQueryKeys } from '../queryKeys';

export const useMonthlyBudgetsQuery = (year: number, month: number) => {
  return useQuery({
    queryKey: monthlyBudgetQueryKeys.monthly(year, month),
    queryFn: () => getMonthlyBudgets({ year, month }),
    enabled: !!year && !!month,
  });
};