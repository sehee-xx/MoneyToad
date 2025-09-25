import { useQuery } from '@tanstack/react-query';
import { getDoojoData } from '../services/doojo';
import { doojoQueryKeys } from '../queryKeys';

export const useDoojoQuery = () => {
  return useQuery({
    queryKey: doojoQueryKeys.data(),
    queryFn: getDoojoData,
  });
};