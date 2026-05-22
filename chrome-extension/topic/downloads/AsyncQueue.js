class AsyncQueue {
  constructor(concurrency = 1) {
    this.concurrency = concurrency; // 最大并发数
    this.queue = [];                // 任务队列
    this.activeCount = 0;           // 当前正在执行的任务数
    this.isPaused = false;          // 暂停状态标识
  }

  /**
   * 添加任务到队列
   * @param {Function} task 返回 Promise 的异步函数
   * @param {Object} options 配置项 { priority, timeout }
   * @returns {Promise} 返回任务最终结果的 Promise
   */
  push(task, options = {}) {
    const { priority = 0, timeout = 0 } = options;

    return new Promise((resolve, reject) => {
      // 包装任务，附带优先级和超时控制
      const item = {
        task,
        priority,
        timeout,
        resolve,
        reject
      };

      // 按照优先级从大到小排序 (若优先级相同，则保持原相对顺序即 FIFO)
      this.queue.sort((a, b) => b.priority - a.priority);

      // 尝试触发调度
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

    // 构造任务执行的主 Promise
    const taskPromise = Promise.resolve().then(() => task());

    // 判断是否开启超时控制
    const finalPromise = timeout > 0 
      ? Promise.race([taskPromise, this._createTimeout(timeout)])
      : taskPromise;

    finalPromise
      .then(resolve)
      .catch(reject)
      .finally(() => {
        this.activeCount--;
        this._next(); // 执行下一个
      });

    // 循环触发，直到填满并发池
    this._next();
  }

  /**
   * 创建超时定时器
   */
  _createTimeout(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Task timeout after ${ms}ms`));
      }, ms);
    });
  }

  /**
   * 暂停队列（无法影响已经在执行中的任务）
   */
  pause() {
    this.isPaused = true;
  }

  /**
   * 恢复队列
   */
  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this._next();
  }

  /**
   * 清空未执行的任务
   */
  clear() {
    const clearQueue = this.queue;
    this.queue = [];
    clearQueue.forEach(({ reject }) => {
      reject('Aborted by User')
    });
  }
}
