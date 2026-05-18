import { prisma } from './dist/src/index.js';

async function main() {
  try {
    const totalMatches = await prisma.match.count();
    const matchesWithCoaches = await prisma.match.count({
      where: {
        AND: [
          { homeCoachId: { not: null } },
          { awayCoachId: { not: null } }
        ]
      }
    });

    const matchesWithNullHomeCoach = await prisma.match.count({
      where: { homeCoachId: null }
    });

    const matchesWithNullAwayCoach = await prisma.match.count({
      where: { awayCoachId: null }
    });

    const totalLeagues = await prisma.league.count();
    const totalCompetitions = await prisma.competition.count();
    const totalCoaches = await prisma.coach.count();
    const totalTeams = await prisma.team.count();

    console.log("=== DATABASE DIAGNOSTICS ===");
    console.log("Total Leagues:", totalLeagues);
    console.log("Total Competitions:", totalCompetitions);
    console.log("Total Coaches:", totalCoaches);
    console.log("Total Teams:", totalTeams);
    console.log("Total Matches:", totalMatches);
    console.log("Matches with both coaches non-null:", matchesWithCoaches);
    console.log("Matches with null home coach:", matchesWithNullHomeCoach);
    console.log("Matches with null away coach:", matchesWithNullAwayCoach);

    if (totalMatches > 0) {
      console.log("\nSample Match 1:");
      const sample = await prisma.match.findFirst({
        include: {
          homeCoach: true,
          awayCoach: true,
          homeTeam: true,
          awayTeam: true
        }
      });
      console.log(JSON.stringify(sample, null, 2));
    }
  } catch (err) {
    console.error("Database connection/query error:", err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
