import { prisma } from '../src/database/client.js';

async function main() {
  const count = await prisma.coach.count({
    where: { name: 'Jakala' }
  });
  console.log(`Nombre de coachs nommés 'Jakala' en BDD : ${count}`);
}

main().catch(console.error);
