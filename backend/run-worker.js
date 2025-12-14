import analysisQueue from './src/queue/analysisQueue.js';
import { processAnalysisJob } from './src/worker.js';

const BATCH_SIZE = 1;

const run = async () => {
    console.log('Worker started, waiting for jobs...');
    
    setInterval(async () => {
        const queue = analysisQueue.getQueue();
        if (queue.length > 0) {
            console.log(`${queue.length} jobs in queue`);
            const jobsToProcess = [];
            let i = 0;
            while(i < BATCH_SIZE && queue.length > 0) {
                const job = analysisQueue.getNext();
                jobsToProcess.push(processAnalysisJob(job));
                i++;
            }

            await Promise.all(jobsToProcess);
        }
    }, 5000); // Check for new jobs every 5 seconds
};

run();
