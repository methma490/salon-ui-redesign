export const planKeys = {
  all: ['plans'] as const,
  public: () => [...planKeys.all, 'public'] as const,
  admin: () => [...planKeys.all, 'admin'] as const,
  detail: (id: string) => [...planKeys.all, 'detail', id] as const,
};
