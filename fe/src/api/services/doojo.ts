import { request, REQUEST_METHOD } from '../client';
import type { ApiDoojoResponse, DoojoResponse } from '../../types';
import { adaptDoojoResponse } from '../../types';

export const getDoojoData = async (): Promise<DoojoResponse> => {
  const response = await request<ApiDoojoResponse>({
    method: REQUEST_METHOD.GET,
    url: `${import.meta.env.VITE_BACK_URL}/api/ai/data/doojo`,
  });

  return adaptDoojoResponse(response);
};