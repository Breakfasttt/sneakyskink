import { bb3ApiClient } from '../src/services/bb3-api-client.js';

async function testMatch() {
  const matchId = 'df44d397-4949-11f1-a124-bc2411305479';
  console.log(`=== Fetching match ${matchId} ===`);
  try {
    const res = await bb3ApiClient.get('/match', { id: matchId, rosters: 1 });
    console.log("Is match defined?", !!res.match);
    if (!res.match) {
      console.log("Response keys:", Object.keys(res));
      console.log("Full response:", res);
    }
  } catch(e: any) { console.error("Error:", e.message); }
}

testMatch();
