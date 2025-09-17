import type { AxiosInstance } from 'axios';
import { useAuthStore } from '../store/authStore';
import { reissueToken } from './services/auth';

export const setupAuthInterceptor = (axiosInstance: AxiosInstance) => {
  let isRefreshing = false;

  // 요청 인터셉터 - 모든 API 요청에 accessToken 자동 추가
  axiosInstance.interceptors.request.use(
    (config) => {
      const { accessToken } = useAuthStore.getState();

      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  // 응답 인터셉터 - 401 에러 시 토큰 재발급 처리
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // 401 에러이고 아직 재시도하지 않은 경우
      if (error.response?.status === 401 && !originalRequest._retry && !isRefreshing) {
        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // reissue 엔드포인트로 POST 요청
          const { accessToken } = await reissueToken();

          // 새 토큰으로 store 업데이트
          const { setAccessToken } = useAuthStore.getState();
          setAccessToken(accessToken);

          // 원래 요청에 새 토큰으로 재시도
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return axiosInstance(originalRequest);
        } catch (reissueError) {
          // 재발급 실패 시 store 클리어하고 메인 페이지로 리다이렉트
          const { clear } = useAuthStore.getState();
          clear();
          window.location.href = '/';
          return Promise.reject(reissueError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );
};