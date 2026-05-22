import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const filePath = 'd:/devperso/antigravity/sneakyskink/sneakyskink-harvester/docs/sample-match-detail.json';
  if (!fs.existsSync(filePath)) {
    console.error(`File does not exist: ${filePath}`);
    return;
  }

  const rawData = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(rawData);

  const teamStatsKeys = new Set<string>();
  const playerStatsKeys = new Set<string>();

  const match = data.match;
  if (match && match.teams) {
    for (const team of match.teams) {
      // Collect team keys
      for (const key of Object.keys(team)) {
        if (key !== 'roster' && key !== 'statistics') {
          teamStatsKeys.add(key);
        }
      }

      // Collect player stats keys
      if (team.roster) {
        for (const player of team.roster) {
          if (player.stats && !Array.isArray(player.stats)) {
            for (const key of Object.keys(player.stats)) {
              playerStatsKeys.add(key);
            }
          }
        }
      }
    }
  }

  console.log('--- Unique Team Keys (excluding roster/statistics) ---');
  console.log(Array.from(teamStatsKeys).sort());

  console.log('\n--- Unique Player Stats Keys ---');
  console.log(Array.from(playerStatsKeys).sort());
}

main().catch(console.error);
