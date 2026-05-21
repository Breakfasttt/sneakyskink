import { prisma } from 'sneakyskink-bdd';

async function main() {
  console.log('Querying races and their player types to establish an absolute mapping...');
  const teams = await prisma.team.findMany({
    select: {
      raceId: true,
      name: true,
      id: true
    }
  });

  const uniqueRaces = new Map<number, { teamName: string; teamId: string }>();
  for (const t of teams) {
    if (!uniqueRaces.has(t.raceId)) {
      uniqueRaces.set(t.raceId, { teamName: t.name, teamId: t.id });
    }
  }

  console.log('\n--- Mapping Results ---');
  for (const [raceId, data] of uniqueRaces.entries()) {
    // Find one player for this team
    const player = await prisma.player.findFirst({
      where: { teamId: data.teamId },
      select: { type: true, name: true }
    });

    console.log(`RaceId: ${raceId} | Team: "${data.teamName}" | Player Type: "${player?.type || 'N/A'}" (${player?.name || 'N/A'})`);
  }
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
