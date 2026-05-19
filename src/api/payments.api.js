import client from './client';

export const topupWallet        = (data)              => client.post('/payments/topup', data).then(r => r.data.data);
export const initiateBoost      = (listingId, data)   => client.post(`/payments/boost/${listingId}`, data).then(r => r.data.data);
export const initiateVerify     = ()                  => client.post('/payments/verify-account').then(r => r.data.data);
export const getBoostPlans      = ()                  => client.get('/payments/boost-plans').then(r => r.data.data);
export const verifyPayment      = (reference)         => client.get(`/payments/verify/${reference}`).then(r => r.data.data);
export const getPaymentHistory  = (params)            => client.get('/payments/history', { params }).then(r => r.data.data);
export const initPayment        = (data)              => client.post('/payments/initialize', data).then(r => r.data.data);
