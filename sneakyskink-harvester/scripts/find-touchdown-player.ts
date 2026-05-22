import * as fs from 'fs';

async function main() {
  const filePath = 'd:/devperso/antigravity/sneakyskink/sneakyskink-harvester/docs/sample-match-detail.json';
  if (!fs.existsSync(filePath)) {
    console.error(`File does not exist: ${filePath}`);
    return;
  }

  const rawData = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(rawData);

  const match = data.match;
  if (match && match.teams) {
    for (const team of match.teams) {
      console.log(`Team: ${team.teamname}, score: ${team.score}`);
      if (team.roster) {
        for (const player of team.roster) {
          // Check if player has any non-zero touchdowns, or check if player has any touchdown related fields
          const hasTd = JSON.stringify(player).toLowerCase().includes('touchdown');
          const hasMvp = player.mvp;
          if (hasTd || hasMvp) {
            console.log(`Player: ${player.name} (#${player.number})`);
            console.log('Player keys:', Object.keys(player));
            if (player.stats) {
              console.log('Player stats:', player.stats);
            }
          }
        }
      }
    }
  }
}

main().catch(console.error);
