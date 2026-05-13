class AsyncPoolIterator {
    constructor(max, tasks) {
        this.max = max;
        // 确保输入是可迭代对象
        this.taskIterator = tasks[Symbol.iterator] ? tasks[Symbol.iterator]() : null;
        this.executing = new Set(); // 存储当前正在执行的 Promise
        this.done = false;          // 标记源迭代器是否已耗尽
    }

    // 部署标准异步迭代器接口
    [Symbol.asyncIterator]() {
        return this;
    }

    // 实现异步迭代器的 next 方法
    async next() {
        if (!this.taskIterator) {
            return { value: undefined, done: true };
        }

        // 持续填充并发池，直到达到上限，或者没有新任务
        while (this.executing.size < this.max && !this.done) {
            const { value: task, done } = this.taskIterator.next();
            
            if (done) {
                this.done = true;
                break;
            }

            // 执行任务，包裹索引以追踪结果
            const promise = Promise.resolve(task()).then(result => {
                // 任务完成后，从执行池中移除自己
                this.executing.delete(promise);
                return result;
            });

            this.executing.add(promise);
        }

        // 边界条件：如果执行池为空且源迭代器已耗尽，说明全部完成
        if (this.executing.size === 0 && this.done) {
            return { value: undefined, done: true };
        }

        // 核心：使用 Promise.race 等待当前池子中【最快完成】的任务
        const fastestResult = await Promise.race(this.executing);
        
        return { value: fastestResult, done: false };
    }
}

// 模拟异步任务生成器
const create_task = (id, delay) => () => 
    new Promise(resolve => setTimeout(() => resolve(`任务 ${id} 完成`), delay));

// 1. 定义一组具有不同耗时的任务
const tasks = [
  create_task(1, 1500), // 任务 1，耗时 1500ms
  create_task(2, 500),  // 任务 2，耗时 500ms
  create_task(3, 300),  // 任务 3，耗时 300ms
  create_task(4, 400),  // 任务 4，耗时 400ms
];

// 2. 初始化迭代器，限制最大并发数为 2
const poolIterator = new AsyncPoolIterator(2, tasks);

// 3. 使用标准 for await...of 消费结果
async function start() {
  console.time("总耗时");
  for await (const result of poolIterator) {
      console.log(`收到产出: ${result}`);
  }
  console.timeEnd("总耗时");
}

start();
