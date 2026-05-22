import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '../src/config/environment.js';

async function main() {
  const connection = new Redis({
    host: env.redis.host,
    port: env.redis.port,
    password: env.redis.password,
    maxRetriesPerRequest: null,
  });

  const queue = new Queue('harvester-queue', { connection });

  try {
    const counts = await queue.getJobCounts();
    const prioritizedCount = await queue.getJobCountByTypes('prioritized');
    console.log('--- STATISTIQUES DE LA FILE D\'ATTENTE ---');
    console.log(`Active:       ${counts.active}`);
    console.log(`Waiting:      ${counts.waiting}`);
    console.log(`Prioritized:  ${prioritizedCount}`);
    console.log(`Delayed:      ${counts.delayed}`);
    console.log(`Paused:       ${counts.paused}`);
    console.log(`Failed:       ${counts.failed}`);
    console.log(`Completed:    ${counts.completed}`);

    const jobs = await queue.getJobs(['waiting', 'active', 'delayed', 'prioritized']);
    console.log(`\nNombre de jobs récupérés : ${jobs.length}`);
    
    const typeCounts: Record<string, number> = {};
    jobs.forEach(job => {
      const type = job.data?.type || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    console.log('\n--- RÉPARTITION PAR TYPE DE JOB ---');
    for (const [type, count] of Object.entries(typeCounts)) {
      console.log(`${type.padEnd(20)}: ${count}`);
    }

    if (jobs.length > 0) {
      console.log('\n--- EXEMPLES DE JOBS ACTIFS/EN ATTENTE ---');
      jobs.slice(0, 10).forEach(j => {
        console.log(`ID: ${j.id} | Name: ${j.name} | Type: ${j.data?.type} | Priority: ${j.opts?.priority || 'none'}`);
      });
    }

  } catch (err) {
    console.error('Erreur :', err);
  } finally {
    await connection.quit();
  }
}

main();
