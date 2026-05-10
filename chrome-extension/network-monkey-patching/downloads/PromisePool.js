class PromisePool {
  constructor(max) {
    this.max = max;
    this.running = 0;
    this.queue = []; // 存储 { resolve, priority }
  }

  async run(task, priority = 0) {
    if (this.running >= this.max) {
      // 将 resolve 函数和优先级一起存入队列
      await new Promise(resolve => {
        this.queue.push({ resolve, priority });
        // 每次加入新任务后，按优先级从大到小排序
        this.queue.sort((a, b) => b.priority - a.priority);
      });
    }

    this.running++;

    try {
      return await task();
    } finally {
      this.running--;
      if (this.queue.length > 0) {
        // 弹出优先级最高（队首）的任务
        const { resolve } = this.queue.shift();
        resolve();
      }
    }
  }
}

// --- 测试代码 ---

const pool = new PromisePool(2); // 限制并发为 2
const sleepTask = (id, ms) => () => 
  new Promise(resolve => {
    setTimeout(() => {
      console.log(`任务 ${id} 完成`);
      resolve(id);
    }, ms);
  });

console.log("开始执行...");

// 前 2 个任务会立即占据并发位
pool.run(sleepTask('Normal-1', 1000), 0);
pool.run(sleepTask('Normal-2', 1000), 0);

// 以下任务进入等待队列
pool.run(sleepTask('Low-Priority', 1000), 0);
pool.run(sleepTask('High-Priority', 1000), 10); // 优先级最高
pool.run(sleepTask('Mid-Priority', 1000), 5);

/* 
预期输出顺序：
1. Normal-1 和 Normal-2 完成
2. High-Priority 完成 (因为它在队列里优先级最高)
3. Mid-Priority 完成
4. Low-Priority 完成
*/
