export class PromisePool {
  constructor(max) {
    this.max = max;
    this.running = 0;
    this.queue = [];
  }

  async run(task) {

    if (this.running >= this.max) {
      await new Promise(resolve => this.queue.push(resolve));
    }

    this.running++;

    try {
      return await task();
    } finally {
      this.running--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        next();
      }
    }
  }
}

const pool = new PromisePool(3);

const sleepTask = (id, ms) => () => 
  new Promise(resolve => {
    console.log(`任务 ${id} 开始运行`);
    setTimeout(() => {
      console.log(`任务 ${id} 完成 √`);
      resolve(id);
    }, ms);
  });

// 正确的测试方式：通过 pool.run 包装每个任务
const tasks = [1, 2, 3, 4, 5, 6, 7, 8].map(id => {
  return pool.run(sleepTask(id, 1000));
});

// 使用 Promise.all 等待所有任务最终完成
Promise.all(tasks).then(res => {
  console.log('所有任务执行完毕:', res);
});

// 核心逻辑解析：
// 并发限制：由于 max 是 3，你会看到前 3 个任务（1, 2, 3）立即打印“开始运行”。
// 排队机制：任务 4-8 会进入 this.queue。因为 run 方法里的 await new Promise(...)，这些任务的执行流会卡在那里。
// 链式唤醒：当任务 1 完成并进入 finally 块时，它执行了 next()（即任务 4 之前存入的 resolve），这让任务 4 的 run 函数继续向下执行。
