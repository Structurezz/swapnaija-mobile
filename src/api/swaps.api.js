import client from './client';

export const getMySwaps       = (status, page = 1, limit = 20) => client.get('/swaps', { params: { status, page, limit } }).then(r => r.data.data);
export const getSwap          = (id)              => client.get(`/swaps/${id}`).then(r => r.data.data);
export const getEscrowInfo    = ()                => client.get('/swaps/escrow-info').then(r => r.data.data);
export const proposeSwap      = (data)            => client.post('/swaps', data).then(r => r.data.data);
export const respondToSwap    = (id, action)      => client.patch(`/swaps/${id}/respond`, { action }).then(r => r.data.data);
export const setDeliveryAddress = (id, data)      => client.patch(`/swaps/${id}/address`, data).then(r => r.data.data);
export const submitShipment     = (id, data)      => client.patch(`/swaps/${id}/shipment`, data).then(r => r.data.data);
export const payEscrowDeposit = (id)              => client.patch(`/swaps/${id}/escrow`).then(r => r.data.data);
export const confirmSwap      = (id)              => client.patch(`/swaps/${id}/confirm`).then(r => r.data.data);
export const disputeSwap      = (id, reason)      => client.patch(`/swaps/${id}/dispute`, { reason }).then(r => r.data.data);
export const payTopUp         = (id)              => client.patch(`/swaps/${id}/topup`).then(r => r.data.data);
