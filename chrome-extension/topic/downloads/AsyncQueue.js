export class AsyncQueue {
  constructor(concurrency = 1, options = {}) {
    this.concurrency = concurrency; // 最大并发数
    this.queue = [];                // 任务队列
    this.activeCount = 0;           // 当前正在执行的任务数
    this.isPaused = false;          // 暂停状态标识
    this.activeTasks = new Map();
    this.onStatusChange = options.onStatusChange || (() => {});
    this._taskIdCounter = 0;
  }

  /**
   * 获取当前队列总数（排队中 + 正在执行）
   */
  get totalCount() {
    return this.queue.length + this.activeTasks.size;
  }

  _notify() {
    this.onStatusChange({
      activeCount: this.activeCount,
      waitingCount: this.queue.length,
      totalCount: this.totalCount,
      isPaused: this.isPaused
    });
  }

  push(task, options = {}) { // 💡 确保这里叫 push
    const { priority = 0, timeout = 0 } = options;
    return new Promise((resolve, reject) => {
      const item = { task, priority, timeout, resolve, reject };
      
      let low = 0;
      let high = this.queue.length;
      while (low < high) {
        const mid = (low + high) >> 1;
        if (this.queue[mid].priority >= priority) low = mid + 1;
        else high = mid;
      }
      this.queue.splice(low, 0, item);

      this._notify();
      this._next();
    });
  }
  /**
   * 核心调度器
   */
  _next() {
    // ✨ 只有在未暂停且有空闲并发位时才执行任务
    while (!this.isPaused && this.activeCount < this.concurrency && this.queue.length > 0) {
      this.activeCount++;
      const { task, timeout, resolve, reject } = this.queue.shift();

      const controller = new AbortController();
      const { signal } = controller;
      const currentTaskId = ++this._taskIdCounter;

      const taskContext = { signal, controller, onQueuePause: () => {}, onQueueResume: () => {} };
      this.activeTasks.set(currentTaskId, taskContext);
      this._notify();

      let timer = null;
      let isSettled = false;

      const safeResolve = (value) => {
        if (isSettled) return;
        isSettled = true;
        if (timer) { clearTimeout(timer); timer = null; }
        resolve(value);
      };
      const safeReject = (err) => {
        if (isSettled) return;
        isSettled = true;
        if (timer) { clearTimeout(timer); timer = null; }
        reject(err);
      };

      const abortHandler = () => { safeReject(new Error('Task was cancelled by user')) };
      signal.addEventListener('abort', abortHandler);

      Promise.resolve()
        .then(() => task(taskContext))
        .then(safeResolve)
        .catch(safeReject)
        .finally(() => {
          if (timer) { clearTimeout(timer); timer = null; }
          signal.removeEventListener('abort', abortHandler);

          taskContext.onQueuePause = null;
          taskContext.onQueueResume = null;

          // ✨ 如果当前任务不在映射表中（说明是被 cancelAll 强杀的）
          // 我们直接跳过计数器的扣减，因为 cancelAll 已经整体重置了计数器，不要重复扣减。
          if (!this.activeTasks.has(currentTaskId)) {
            return;
          }

          this.activeTasks.delete(currentTaskId);
          this.activeCount = Math.max(0, this.activeCount - 1);
          this._notify();
          this._next(); // 驱动下一个任务
        });

      // 超时熔断控制
      if (timeout > 0) {
        timer = setTimeout(() => {
          if (isSettled) return;
          signal.removeEventListener('abort', abortHandler);
          safeReject(new Error(`Task rejected: Timeout after ${timeout}ms`));
          controller.abort();
        }, timeout);
      }
    }
  }

  cancelAll() {
    // 1. 清空并拒绝所有排队任务
    while (this.queue.length > 0) {
      const { reject } = this.queue.shift();
      reject(new Error('Queue cleared: Task cancelled before running'));
    }

    // 2. 强杀所有运行中的 Chrome 下载
    this.activeTasks.forEach(taskContext => {
      try {
        taskContext.controller.abort();
      } catch (e) {}
    });

    // 3. 强制重置核心计数器，确保并发池干净
    this.activeTasks.clear();
    this.activeCount = 0;

    // 4. 同步UI状态
    this._notify();
    
    console.log('🛑 队列已安全清空，并发计数器重置');
  }

  pause() { 
    this.isPaused = true; 
    this.activeTasks.forEach(t => t.onQueuePause());
    this._notify(); 
  }
  
  resume() { 
    if (!this.isPaused) return; 
    this.isPaused = false; 
    this.activeTasks.forEach(t => t.onQueueResume());
    this._notify(); 
    this._next(); 
  }

  setConcurrency(newConcurrency) {
    if (typeof newConcurrency !== 'number' || newConcurrency <= 0) {
       console.warn('Concurrency must be a positive integer');
      return;
    }
    if (newConcurrency === this.concurrency) return; // 无变化
    if (!this.isPaused) {
      this.concurrency = newConcurrency;
      this._notify();
      this._next(); // 调整并发数后尝试执行更多任务
    }
  }
}
