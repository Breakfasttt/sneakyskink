import { bb3ApiClient } from '../src/services/bb3-api-client.js';

async function testRuleParam(paramValue: string) {
  try {
    console.log(`Testing rules endpoint with rule='${paramValue}'...`);
    const data = await bb3ApiClient.get('rules', { rule: paramValue });
    if (data && !data.error) {
      console.log(`[SUCCESS] rule='${paramValue}' returned data! Keys:`, Object.keys(data));
      // Log snippet
      console.log(JSON.stringify(data).substring(0, 500));
      return true;
    } else {
      console.log(`[FAILED] rule='${paramValue}' returned error:`, data?.error || 'Empty response');
    }
  } catch (err: any) {
    console.log(`[ERROR] rule='${paramValue}':`, err.message);
  }
  return false;
}

async function main() {
  const params = ['races', 'factions', 'race', 'faction', 'teams', 'roster', 'skills', 'positions', 'categories'];
  for (const p of params) {
    await testRuleParam(p);
    // Add delay to prevent rate limit
    await new Promise(r => setTimeout(r, 2500));
  }
}

main();
