import { request, REQUEST_METHOD } from '../client';
import type { MonthlyBudgetResponse, YearlyBudgetLeakResponse } from '../../types';

type GetMonthlyBudgetsParams = {
  year: number;
  month: number;
};

export const getMonthlyBudgets = async ({ year, month }: GetMonthlyBudgetsParams) => {
  const response = await request<MonthlyBudgetResponse[]>({
    method: REQUEST_METHOD.GET,
    url: `${import.meta.env.VITE_BACK_URL}/api/budgets/${year}/${month}`,
  });

  return response;
};

export const getYearlyBudgetLeaks = async () => {
  const response = await request<YearlyBudgetLeakResponse[]>({
    method: REQUEST_METHOD.GET,
    url: `${import.meta.env.VITE_BACK_URL}/api/budgets`,
  });

  return response;
};