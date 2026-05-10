class PriorityQueue {
  constructor() {
    this.heap = [];
  }

  // 插入元素：插入尾部后向上调整（Bubble Up）
  push(node) {
    this.heap.push(node);
    this._bubbleUp(this.heap.length - 1);
  }

  // 弹出最高优先级：取出头部后，将尾部移到头部向下调整（Bubble Down）
  pop() {
    if (this.size() === 0) return null;
    const top = this.heap[0];
    const bottom = this.heap.pop();
    if (this.size() > 0) {
      this.heap[0] = bottom;
      this._bubbleDown(0);
    }
    return top;
  }

  size() {
    return this.heap.length;
  }

  _bubbleUp(index) {
    while (index > 0) {
      let parentIndex = (index - 1) >> 1;
      if (this.heap[index].priority <= this.heap[parentIndex].priority) break;
      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
      index = parentIndex;
    }
  }

  _bubbleDown(index) {
    while (true) {
      let left = (index << 1) + 1;
      let right = (index << 1) + 2;
      let highest = index;

      if (left < this.size() && this.heap[left].priority > this.heap[highest].priority) highest = left;
      if (right < this.size() && this.heap[right].priority > this.heap[highest].priority) highest = right;
      
      if (highest === index) break;
      [this.heap[index], this.heap[highest]] = [this.heap[highest], this.heap[index]];
      index = highest;
    }
  }
}

export class PromisePool {
  constructor(max) {
    this.max = max;
    this.running = 0;
    this.queue = new PriorityQueue(); // 使用堆结构
  }

  async run(task, priority = 0) {
    if (this.running >= this.max) {
      // 封装成 resolve 对象存入堆
      await new Promise(resolve => {
        this.queue.push({ resolve, priority });
      });
    }

    this.running++;

    try {
      return await task();
    } finally {
      this.running--;
      if (this.queue.size() > 0) {
        // 从堆中取出优先级最高的一个
        const { resolve } = this.queue.pop();
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
