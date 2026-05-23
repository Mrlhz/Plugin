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
      totalCount: this.queue.length + this.activeCount || this.totalCount,
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
    // 如果队列已暂停，或者当前并发数达到上限，或者队列已空，则停止调度
    if (this.isPaused || this.activeCount >= this.concurrency || this.queue.length === 0) {
      return;
    }

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
      if (timer) clearTimeout(timer);
      resolve(value);
    };
    const safeReject = (err) => {
      if (isSettled) return;
      isSettled = true;
      if (timer) clearTimeout(timer);
      reject(err);
    };

    const abortHandler = () => { safeReject(new Error('Task was cancelled by user')) }
    signal.addEventListener('abort', abortHandler);

    Promise.resolve()
      .then(() => task(taskContext))
      .then(safeResolve)
      .catch(safeReject)
      .finally(() => {
        if (timer) clearTimeout(timer);
        signal.removeEventListener('abort', abortHandler);

        taskContext.onQueuePause = null;
        taskContext.onQueueResume = null;

        if (!this.activeTasks.has(currentTaskId)) {
          // 不扣减计数，不触发_next()干扰新队列
          return;
        }

        this.activeTasks.delete(currentTaskId);
        this.activeCount = Math.max(0, this.activeCount - 1);
        this._notify();
        this._next();
      });

    if (timeout > 0) {
      timer = setTimeout(() => {
        if (isSettled) return;
        signal.removeEventListener('abort', abortHandler);
        safeReject(new Error(`Task rejected: Timeout after ${timeout}ms`));
        controller.abort();
      }, timeout);
    }

    this._next();
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
    this.onStatusChange({
      activeCount: 0,
      waitingCount: 0,
      totalCount: 0,
      isPaused: this.isPaused
    });
    
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
}
