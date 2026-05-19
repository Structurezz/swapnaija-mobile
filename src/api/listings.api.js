import client from './client';

export const getCategories      = ()              => client.get('/categories').then(r => r.data.data);
export const searchListings     = (params)        => client.get('/listings', { params }).then(r => r.data.data);
export const getListing         = (id)            => client.get(`/listings/${id}`).then(r => r.data.data);
export const createListing      = (data)          => client.post('/listings', data).then(r => r.data.data);
export const updateListing      = (id, data)      => client.patch(`/listings/${id}`, data).then(r => r.data.data);
export const deleteListing      = (id)            => client.delete(`/listings/${id}`).then(r => r.data.data);
export const getMyListings      = (status)        => client.get('/listings/mine', { params: { status } }).then(r => r.data.data);
export const uploadListingImages = (id, formData) => client.post(`/listings/${id}/images`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.data);
export const getMatches         = (listingId, params) => client.get(`/matches/${listingId}`, { params }).then(r => r.data.data);
export const getSuggested       = (params)        => client.get('/matches/suggested', { params }).then(r => r.data.data);
export const getHomeFeed        = ()              => client.get('/listings/home-feed').then(r => r.data.data);
