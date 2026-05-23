import fs from 'fs';

async function main() {
  const fileContent = fs.readFileSync('d:/devperso/antigravity/sneakyskink/sneakyskink-harvester/docs/sample-match-detail.json', 'utf-8');
  const data = JSON.parse(fileContent);

  const keys = new Set<string>();

  const teams = data.match?.teams || [];
  for (const team of teams) {
    const roster = team.roster || [];
    for (const player of roster) {
      const stats = player.stats || {};
      for (const k of Object.keys(stats)) {
        keys.add(k);
      }
    }
  }

  console.log('Unique player stats keys found in sample-match-detail.json:', Array.from(keys));
}

main().catch(console.error);
