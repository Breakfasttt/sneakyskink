import { prisma } from 'sneakyskink-bdd';

async function main() {
  console.log('Querying PlayerMatchStats fields stats count...');
  const total = await prisma.playerMatchStats.count();
  console.log(`Total stats rows: ${total}`);

  const withXp = await prisma.playerMatchStats.count({ where: { xpGained: { gt: 0 } } });
  const withCasualties = await prisma.playerMatchStats.count({ where: { casualtiesInflicted: { gt: 0 } } });
  const withKos = await prisma.playerMatchStats.count({ where: { koInflicted: { gt: 0 } } });
  const withDead = await prisma.playerMatchStats.count({ where: { deadInflicted: { gt: 0 } } });
  const withPushouts = await prisma.playerMatchStats.count({ where: { pushouts: { gt: 0 } } });

  console.log(`Rows with xpGained > 0: ${withXp}`);
  console.log(`Rows with casualtiesInflicted > 0: ${withCasualties}`);
  console.log(`Rows with koInflicted > 0: ${withKos}`);
  console.log(`Rows with deadInflicted > 0: ${withDead}`);
  console.log(`Rows with pushouts > 0: ${withPushouts}`);

  if (total > 0) {
    console.log('\nSample rows with non-zero values:');
    const sample = await prisma.playerMatchStats.findFirst({
      where: {
        OR: [
          { xpGained: { gt: 0 } },
          { casualtiesInflicted: { gt: 0 } },
          { koInflicted: { gt: 0 } },
          { deadInflicted: { gt: 0 } },
          { pushouts: { gt: 0 } }
        ]
      },
      include: {
        player: { select: { name: true } }
      }
    });
    console.log(JSON.stringify(sample, null, 2));
  }
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
