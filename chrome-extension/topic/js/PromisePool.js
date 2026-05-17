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
      if (this.heap[index].priority <= this.heap[parentIndex].priority) {
        break;
      }
      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
      index = parentIndex;
    }
  }

  _bubbleDown(index) {
    while (true) {
      let left = (index << 1) + 1;
      let right = (index << 1) + 2;
      let highest = index;

      if (left < this.size() && this.heap[left].priority > this.heap[highest].priority) {
        highest = left;
      }
      if (right < this.size() && this.heap[right].priority > this.heap[highest].priority) {
        highest = right;
      }

      if (highest === index) {
        break;
      }
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

  async run(task, { priority = 0, signal = null } = {}) {
    // 1. 边缘防御：入队前已经取消则直接拦截
    if (signal?.aborted) {
      throw new Error('Task Aborted by User');
    }

    // 2. 创建内部联动控制器：它既能响应排队取消，也能响应运行中取消
    const internalController = new AbortController();

    // 如果外部传入了 signal，使内部控制器与之联动
    const onExternalAbort = () => internalController.abort();
    if (signal) {
      signal.addEventListener('abort', onExternalAbort);
    }

    if (this.running >= this.max) {
      let onQueueAbort = null;
      try {
        await new Promise((resolve, reject) => {
          // 封装排队节点
          const queueNode = { resolve, reject, priority, signal };
          this.queue.push(queueNode);

          // 修复点 2：提取解耦的取消监听器，以便后续精准移除
          onQueueAbort = () => {
            queueNode.isAborted = true; 
            reject(new Error('Task Aborted by User'));
          };
          internalController.signal.addEventListener('abort', onQueueAbort);
        });
      } catch (error) {
        // 修复点 1：排队期间任务取消，必须触发 _next() 唤醒其余替补任务，防止死锁
        this._next();
        throw error;
      } finally {
        if (onQueueAbort) {
          internalController.signal.removeEventListener('abort', onQueueAbort);
        }
        // 清理排队联动监听
        if (signal) signal.removeEventListener('abort', onExternalAbort);
      }
    }

    // 双重检查防线
    if (internalController.signal.aborted) {
      this._next();
      throw new Error('Task Aborted by User');
    }

    this.running++;

    try {
      // 传递核心：必须将内部控制器的 signal 传给具体的任务
      return await task(internalController.signal);
    } finally {
      this.running--;
      if (signal) signal.removeEventListener('abort', onExternalAbort);
      // 正常执行完毕或抛出异常，腾出空位，调度下一发
      this._next();
    }
  }

  // 调度下一个有效任务，跳过已被排队取消的任务
  _next() {
    while (this.queue.size() > 0) {
      // 从堆中取出优先级最高的一个
      const node = this.queue.pop();
      // 如果该任务在排队期间没有被取消，则激活它
      if (!node.isAborted) {
        node.resolve();
        break; // 成功激活一个有效任务，退出循环
      }
    }
  }
}
