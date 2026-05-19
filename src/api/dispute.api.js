import client from './client';

export const getDisputeRoom = (swapId) =>
  client.get(`/dispute/swap/${swapId}`).then(r => r.data.data);

export const sendDisputeMessage = (roomId, content, messageType = 'text', attachmentMeta = null) =>
  client.post(`/dispute/room/${roomId}/message`, {
    content, messageType,
    ...(attachmentMeta || {}),
  }).then(r => r.data.data);

export const uploadEvidenceFile = (roomId, localUri, filename, mimeType) => {
  const form = new FormData();
  form.append('file', { uri: localUri, name: filename, type: mimeType });
  return client.post(`/dispute/room/${roomId}/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data.data);
};

export const findLawyers = (params = {}) =>
  client.get('/dispute/lawyers', { params }).then(r => r.data.data);

export const requestCounsel = (roomId, counselId, proposedFeeKobo) =>
  client.post(`/dispute/room/${roomId}/counsel`, { counselId, proposedFeeKobo })
    .then(r => r.data.data);
