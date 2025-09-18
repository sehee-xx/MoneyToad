export const userQueryKeys = {
  all: ['users'] as const,
  info: () => [...userQueryKeys.all, 'info'] as const,
} as const;