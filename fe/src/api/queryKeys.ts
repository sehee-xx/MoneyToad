export const userQueryKeys = {
  all: ['users'] as const,
  info: () => [...userQueryKeys.all, 'info'] as const,
} as const;

export const cardQueryKeys = {
  all: ['cards'] as const,
  info: () => [...cardQueryKeys.all, 'info'] as const,
} as const;