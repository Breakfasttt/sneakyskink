import { SneakySkinkApiClient } from 'sneakyskink-api-client';

const ADMIN_KEY_STORAGE_KEY = 'sneakyskink_admin_key';
const API_BASE_URL = 'http://localhost:3001';

export function getSavedAdminKey(): string {
  return localStorage.getItem(ADMIN_KEY_STORAGE_KEY) || '';
}

export function saveAdminKey(key: string): void {
  localStorage.setItem(ADMIN_KEY_STORAGE_KEY, key);
}

export function removeAdminKey(): void {
  localStorage.removeItem(ADMIN_KEY_STORAGE_KEY);
}

/**
 * Retourne une instance configurée du client API.
 * Lit dynamiquement la clé admin dans le localStorage si elle n'est pas passée en paramètre.
 */
export function getApiClient(customKey?: string): SneakySkinkApiClient {
  const apiKey = customKey !== undefined ? customKey : getSavedAdminKey();
  return new SneakySkinkApiClient({
    baseUrl: API_BASE_URL,
    apiKey: apiKey,
  });
}
