import client from './client';

// ── Phone OTP (primary auth) ──────────────────────────────────────────────────
export const sendOtp        = (phone)              => client.post('/auth/send-otp', { phone }).then(r => r.data.data);
export const verifyOtp      = (phone, code)        => client.post('/auth/verify-otp', { phone, code }).then(r => r.data.data);

// ── Email / Password + OTP sign-in (main flow) ───────────────────────────────
export const register       = (data)               => client.post('/auth/register', data).then(r => r.data.data);
export const login          = (data)               => client.post('/auth/login', data).then(r => r.data.data);
export const loginOtp       = (data)               => client.post('/auth/login-otp', data).then(r => r.data.data);
export const sendEmailOtp   = (email)              => client.post('/auth/send-email-otp', { email }).then(r => r.data.data);
export const verifyEmailOtp = (email, code)        => client.post('/auth/verify-email-otp', { email, code }).then(r => r.data.data);

// ── Forgot / Reset Password ───────────────────────────────────────────────────
export const forgotPassword = (email)              => client.post('/auth/forgot-password', { email }).then(r => r.data.data);
export const resetPassword  = (data)               => client.post('/auth/reset-password', data).then(r => r.data.data);
export const changePassword = (data)               => client.put('/auth/change-password', data).then(r => r.data.data);

// ── Token management ──────────────────────────────────────────────────────────
export const refreshToken   = (token)              => client.post('/auth/refresh', { refreshToken: token }).then(r => r.data.data);
export const logoutApi      = (token)              => client.post('/auth/logout', { refreshToken: token }).then(r => r.data.data);

// ── User profile ──────────────────────────────────────────────────────────────
export const getMe          = ()                   => client.get('/users/me').then(r => r.data.data);
export const updateMe       = (data)               => client.patch('/users/me', data).then(r => r.data.data);
export const uploadAvatar   = (formData)           => client.post('/users/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.data);
export const getUser        = (userId)             => client.get(`/users/${userId}`).then(r => r.data.data);
