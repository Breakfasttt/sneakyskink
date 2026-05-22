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
      console.log(`\n======================= Team: ${team.teamname} =======================`);
      if (team.roster) {
        for (const player of team.roster) {
          if (player.stats && !Array.isArray(player.stats) && Object.keys(player.stats).length > 0) {
            console.log(`Player: ${player.name} (#${player.number}) - MVP: ${player.mvp} - XP Gain: ${player.xp_gain}`);
            console.log('Stats:', player.stats);
          }
        }
      }
    }
  }
}

main().catch(console.error);
