import axios from 'axios';

const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  'https://kuryesistemiyemek.onrender.com/api'
).replace(/\/+$/, '');

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  return config;
});
