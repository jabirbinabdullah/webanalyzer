import { Queue, Worker } from 'bullmq';
import { processAnalysisJob } from '../worker.js';
import redisConnection from '../config/redis.js';

const queueName = 'analysis';

// Create a new BullMQ queue
export const analysisQueue = new Queue(queueName, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential',
      delay: 5000, // Wait 5s before first retry, then 10s, 20s
    },
  },
});

// Create a worker to process jobs from the queue
if (process.env.NODE_ENV !== 'test') {
  console.log('Starting BullMQ worker...');
  const worker = new Worker(
    queueName,
    async (job) => {
      await processAnalysisJob(job.data);
    },
    { connection: redisConnection }
  );

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} has completed!`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} has failed with ${err.message}`);
  });
}

// Export the queue so it can be used to add jobs
export default analysisQueue;
