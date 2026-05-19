import client from './client';

export const createReview   = (data)   => client.post('/reviews', data).then(r => r.data.data);
export const getUserReviews = (userId) => client.get(`/reviews/user/${userId}`).then(r => r.data.data);
