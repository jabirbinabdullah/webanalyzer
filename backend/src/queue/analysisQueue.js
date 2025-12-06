// A simple in-memory queue
const queue = [];

const add = (job) => {
  queue.push(job);
};

const getNext = () => {
  return queue.shift();
};

const getQueue = () => {
    return queue;
}

export default {
  add,
  getNext,
  getQueue,
};
