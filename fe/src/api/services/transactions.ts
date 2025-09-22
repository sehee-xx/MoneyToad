import { request, REQUEST_METHOD } from '../client';
import type { TransactionYear, MonthlyTransaction } from '../../types';

export const getYearTransaction = async () => {
  const response = await request<TransactionYear[]>({
    method: REQUEST_METHOD.GET,
    url: `${import.meta.env.VITE_BACK_URL}/api/transactions`,
  });

  return response;
};

export const getMonthlyTransactions = async (year: number, month: number) => {
  const response = await request<MonthlyTransaction[]>({
    method: REQUEST_METHOD.GET,
    url: `${import.meta.env.VITE_BACK_URL}/api/transactions/${year}/${month}`,
  });

  return response;
};