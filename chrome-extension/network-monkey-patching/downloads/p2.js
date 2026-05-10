class PromisePool {
  constructor(max) {
    this.max = max;
    this.running = 0;
    this.queue = []; 
  }

  /**
   * @param {Function} task 任务函数
   * @param {Object} options { priority, timeout, signal }
   */
  async run(task, { priority = 0, timeout = Infinity, signal = null } = {}) {
    // 1. 立即检查信号是否已取消
    if (signal?.aborted) throw new Error('Task Cancelled');

    if (this.running >= this.max) {
      await new Promise((resolve, reject) => {
        const item = { resolve, reject, priority, signal };
        
        // 2. 处理排队时的手动取消
        signal?.addEventListener('abort', () => {
          this._removeFromQueue(item);
          reject(new Error('Task Cancelled in Queue'));
        }, { once: true });

        this._enqueue(item);
      });
    }

    this.running++;

    try {
      // 3. 组合超时控制
      let timeoutId;
      const timeoutPromise = timeout === Infinity 
        ? new Promise(() => {}) // 永不超时
        : new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('Task Timeout')), timeout);
          });

      // 任务执行逻辑
      const result = await Promise.race([
        task(signal), // 建议将 signal 传给任务内部
        timeoutPromise
      ]);

      clearTimeout(timeoutId);
      return result;
    } finally {
      this.running--;
      this._next();
    }
  }

  _enqueue(item) {
    // 二分插入逻辑 (同前)
    let low = 0, high = this.queue.length;
    while (low < high) {
      let mid = (low + high) >>> 1;
      if (this.queue[mid].priority >= item.priority) low = mid + 1;
      else high = mid;
    }
    this.queue.splice(low, 0, item);
  }

  _removeFromQueue(item) {
    const index = this.queue.indexOf(item);
    if (index > -1) this.queue.splice(index, 1);
  }

  _next() {
    if (this.queue.length > 0) {
      const { resolve } = this.queue.shift();
      resolve();
    }
  }
}

// 1. 超时控制
const pool = new PromisePool(1);

// 任务需要 2s，但设置 1s 超时
pool.run(() => new Promise(r => setTimeout(r, 2000)), { timeout: 1000 })
  .catch(err => console.log(err.message)); // 输出: Task Timeout


// 2. 手动取消
const controller = new AbortController();
const pool = new PromisePool(1);

// 第一个任务占满位置
pool.run(() => new Promise(r => setTimeout(r, 5000)));

// 第二个任务进入排队
const p2 = pool.run(() => console.log("执行任务2"), { signal: controller.signal });

// 突然不想等了，取消任务2
controller.abort(); 

p2.catch(err => console.log(err.message)); // 输出: Task Cancelled in Queue

