import { request, REQUEST_METHOD } from '../client';
import type { UserInfo } from '../../types/user';

export const getUserInfo = async () => {
  const response = await request<UserInfo>({
    method: REQUEST_METHOD.GET,
    url: `${import.meta.env.VITE_BACK_URL}/api/users`,
  });

  return response;
};