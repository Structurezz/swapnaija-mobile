import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { setAuthStoreAccessors } from '../api/client';

export const useAuthStore = create((set, get) => {
  // Wire the axios client to this store
  setAuthStoreAccessors(
    () => get(),
    (updates) => set(updates)
  );

  return {
    user: null,
    accessToken: null,
    refreshToken: null,
    initialized: false,

    init: async () => {
      try {
        const [accessToken, refreshToken, userJson] = await Promise.all([
          SecureStore.getItemAsync('accessToken'),
          SecureStore.getItemAsync('refreshToken'),
          SecureStore.getItemAsync('user'),
        ]);
        const user = userJson ? JSON.parse(userJson) : null;
        set({ accessToken, refreshToken, user, initialized: true });
      } catch {
        set({ initialized: true });
      }
    },

    login: async (tokens, user) => {
      const { accessToken, refreshToken } = tokens;
      await Promise.all([
        SecureStore.setItemAsync('accessToken', accessToken),
        SecureStore.setItemAsync('refreshToken', refreshToken),
        SecureStore.setItemAsync('user', JSON.stringify(user)),
      ]);
      set({ accessToken, refreshToken, user });
    },

    setAccessToken: (accessToken) => {
      set({ accessToken });
      SecureStore.setItemAsync('accessToken', accessToken).catch(() => {});
    },

    updateUser: (updates) => {
      const user = get().user ? { ...get().user, ...updates } : null;
      set({ user });
      if (user) SecureStore.setItemAsync('user', JSON.stringify(user)).catch(() => {});
    },

    logout: async () => {
      await Promise.all([
        SecureStore.deleteItemAsync('accessToken'),
        SecureStore.deleteItemAsync('refreshToken'),
        SecureStore.deleteItemAsync('user'),
      ]);
      set({ user: null, accessToken: null, refreshToken: null });
    },

    isAuthenticated: () => !!(get().accessToken && get().user),
  };
});
