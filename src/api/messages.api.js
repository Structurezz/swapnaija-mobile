import client from './client';

export const getConversations   = ()                            => client.get('/messages/conversations').then(r => r.data.data);
export const getConversation    = (id)                          => client.get(`/messages/conversations/${id}`).then(r => r.data.data);
export const getMessages        = (conversationId, params)      => client.get(`/messages/conversations/${conversationId}/messages`, { params }).then(r => r.data.data);
export const sendMessage        = (conversationId, content, msgType = 'text') => client.post(`/messages/conversations/${conversationId}/messages`, { content, msgType }).then(r => r.data.data);
export const startConversation  = (targetUserId, swapId)        => client.post('/messages/conversations', { targetUserId, swapId }).then(r => r.data.data);
