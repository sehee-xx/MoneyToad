import { request, REQUEST_METHOD } from '../client';

export interface ReissueTokenResponse {
  accessToken: string;
}

export const reissueToken = async () => {
  const response = await request<ReissueTokenResponse>({
    method: REQUEST_METHOD.POST,
    url: `${import.meta.env.VITE_BACK_URL}/auth/reissue`,
  });

  return response.data;
};