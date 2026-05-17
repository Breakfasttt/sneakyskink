import { SneakySkinkApiClient } from 'sneakyskink-api-client';

export const api = new SneakySkinkApiClient({
  baseUrl: 'http://localhost:3001',
  timeout: 15000,
});
