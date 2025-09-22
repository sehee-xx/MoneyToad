import { useQuery } from '@tanstack/react-query';
import { getYearTransaction } from '../services/transactions';
import { transactionQueryKeys } from '../queryKeys';

export const useYearTransactionQuery = () => {
  return useQuery({
    queryKey: transactionQueryKeys.year(),
    queryFn: getYearTransaction,
  });
};