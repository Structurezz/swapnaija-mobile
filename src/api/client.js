import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const PROD_URL = 'https://swapnigeria-production.up.railway.app/api';

// Always use production — all data lives there.
// Override with EXPO_PUBLIC_API_URL for local backend testing.
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || PROD_URL;

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// We'll set this from the auth store after initialization
let _getState = null;
let _setState = null;

export const setAuthStoreAccessors = (getState, setState) => {
  _getState = getState;
  _setState = setState;
};

// Request interceptor: attach access token
client.interceptors.request.use((config) => {
  const token = _getState?.()?.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: auto-refresh on 401
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => refreshSubscribers.push(cb);
const onRefreshed = (token) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(client(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = _getState?.()?.refreshToken;
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const newToken = data.data.accessToken;

        _setState?.({ accessToken: newToken });
        await SecureStore.setItemAsync('accessToken', newToken);
        onRefreshed(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return client(originalRequest);
      } catch (refreshError) {
        _setState?.({ user: null, accessToken: null, refreshToken: null });
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default client;
