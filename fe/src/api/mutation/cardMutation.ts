import { useMutation, useQueryClient } from '@tanstack/react-query';
import { registerCard, type RegisterCardRequest } from '../services/cards';
import { cardQueryKeys } from '../queryKeys';

export const useRegisterCardMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterCardRequest) => registerCard(data),
    onSuccess: () => {
      // 카드 정보 쿼리 무효화하여 최신 데이터 다시 가져오기
      queryClient.invalidateQueries({
        queryKey: cardQueryKeys.info(),
      });
    },
  });
};