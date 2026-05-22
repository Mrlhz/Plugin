class AsyncQueue {
  constructor(concurrency = 1) {
    this.concurrency = concurrency; // 最大并发数
    this.queue = [];                // 任务队列
    this.activeCount = 0;           // 当前正在执行的任务数
    this.isPaused = false;          // 暂停状态标识
  }

  /**
   * 添加异步任务到队列中
   * @param {Function} task - 返回 Promise 的异步任务函数
   * @param {Object} options - 配置项
   * @param {number} options.priority - 优先级，数字越大越先执行 (默认为 0)
   * @param {number} options.timeout - 超时时间，单位毫秒 (可选)
   * @returns {Promise} 返回一个包装后的 Promise
   */
  push(task, options = {}) {
    const { priority = 0, timeout = null } = options;

    return new Promise((resolve, reject) => {
      // 将任务及其实际控制权限包装后入队
      this.queue.push({
        task,
        priority,
        timeout,
        resolve,
        reject
      });

      // 按照优先级从大到小排序 (若优先级相同，则保持原相对顺序即 FIFO)
      this.queue.sort((a, b) => b.priority - a.priority);

      // 尝试触发队列执行
      this._next();
    });
  }

  // 内部调度方法
  _next() {
    // 状态拦截：若暂停、并发数满、或队列为空，则不继续执行
    if (this.isPaused || this.activeCount >= this.concurrency || this.queue.length === 0) {
      return;
    }

    this.activeCount++;
    // 从队列头部取出优先级最高的任务
    const { task, timeout, resolve, reject } = this.queue.shift();

    // 构造带超时控制的执行体
    let taskPromise = Promise.resolve().then(() => task());

    if (timeout !== null && timeout > 0) {
      let timer;
      const timeoutPromise = new Promise((_, rejectTimeout) => {
        timer = setTimeout(() => {
          rejectTimeout(new Error(`Task timed out after ${timeout}ms`));
        }, timeout);
      });

      // 使用 Promise.race 竞争竞赛，超时则触发熔断
      taskPromise = Promise.race([
        taskPromise.then((res) => {
          clearTimeout(timer); // 任务提前完成，清除定时器
          return res;
        }),
        timeoutPromise
      ]);
    }

    // 执行任务并处理后续流转
    taskPromise
      .then(resolve)
      .catch(reject)
      .finally(() => {
        this.activeCount--;
        this._next(); // 释放并发位，递归触发下一个任务
      });

    // 只要并发通道未满，继续尝试提取下一个任务同步执行
    this._next();
  }

  // 暂停队列 (不会中断已经开始执行的任务，但会拦截未执行的任务)
  pause() {
    this.isPaused = true;
  }

  // 恢复队列
  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this._next();
  }

  // 清空等待队列
  clear() {
    this.queue = [];
  }
}
