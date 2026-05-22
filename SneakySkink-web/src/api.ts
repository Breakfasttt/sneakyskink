import { SneakySkinkApiClient } from 'sneakyskink-api-client';

const getBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location) {
    return `http://${window.location.hostname}:3001`;
  }
  return 'http://localhost:3001';
};

export const api = new SneakySkinkApiClient({
  baseUrl: getBaseUrl(),
  timeout: 15000,
});

