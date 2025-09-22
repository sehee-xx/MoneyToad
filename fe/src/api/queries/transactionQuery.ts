import { useQuery } from '@tanstack/react-query';
import { getYearTransaction, getMonthlyTransactions } from '../services/transactions';
import { transactionQueryKeys } from '../queryKeys';

export const useYearTransactionQuery = () => {
  return useQuery({
    queryKey: transactionQueryKeys.year(),
    queryFn: getYearTransaction,
  });
};

export const useMonthlyTransactionsQuery = (year: number, month: number) => {
  return useQuery({
    queryKey: transactionQueryKeys.monthly(year, month),
    queryFn: () => getMonthlyTransactions(year, month),
    enabled: !!year && !!month,
  });
};