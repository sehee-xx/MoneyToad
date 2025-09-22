import { request, REQUEST_METHOD } from '../client';
import type { TransactionYear } from '../../types';

export const getYearTransaction = async () => {
  const response = await request<TransactionYear[]>({
    method: REQUEST_METHOD.GET,
    url: `${import.meta.env.VITE_BACK_URL}/api/transactions`,
  });

  return response;
};;