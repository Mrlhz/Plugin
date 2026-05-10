class PromisePool {
  constructor(max) {
    this.max = max;
    this.running = 0;
    this.queue = []; 
  }

  // 辅助方法：找到正确的位置并插入，保持 queue 降序
  _enqueue(item) {
    let low = 0;
    let high = this.queue.length;

    while (low < high) {
      let mid = (low + high) >>> 1;
      // 优先级高的排在前面
      if (this.queue[mid].priority >= item.priority) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    this.queue.splice(low, 0, item);
  }

  async run(task, priority = 0) {
    if (this.running >= this.max) {
      await new Promise(resolve => {
        this._enqueue({ resolve, priority });
      });
    }

    this.running++;

    try {
      return await task();
    } finally {
      this.running--;
      if (this.queue.length > 0) {
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
