class AsyncPoolIterator {
    // 定义一个内部唯一的错误占位符，避免与用户的合法返回值冲突
    static #ERROR_SYMBOL = Symbol('TASK_REJECTED');

    constructor(max, tasks) {
        this.max = max;
        this.taskIterator = tasks[Symbol.iterator] ? tasks[Symbol.iterator]() : null;
        this.executing = new Set();
        this.done = false;
    }

    [Symbol.asyncIterator]() {
        return this;
    }

    async next() {
        if (!this.taskIterator) {
            return { value: undefined, done: true };
        }

        while (true) {
            // 1. 填充并发池
            while (this.executing.size < this.max && !this.done) {
                const { value: task, done } = this.taskIterator.next();
                
                if (done) {
                    this.done = true;
                    break;
                }

                // 执行任务并强制捕获异常
                const promise = Promise.resolve(task())
                    .catch(err => {
                        // 打印日志（可选），然后返回私有符号
                        console.warn(`[忽略错误]`, err?.message || err);
                        return AsyncPoolIterator.#ERROR_SYMBOL;
                    })
                    .then(result => {
                        this.executing.delete(promise);
                        return result;
                    });

                this.executing.add(promise);
            }

            // 2. 检查结束条件
            if (this.executing.size === 0 && this.done) {
                return { value: undefined, done: true };
            }

            // 3. 竞争最快完成的任务
            const fastestResult = await Promise.race(this.executing);
            
            // 4. 如果是最快完成的任务报错了，跳过它，进入下一次循环继续竞争
            if (fastestResult === AsyncPoolIterator.#ERROR_SYMBOL) {
                continue;
            }

            // 5. 正常的合法结果，正常产出
            return { value: fastestResult, done: false };
        }
    }
}


// 模拟异步任务生成器
const create_task = (id, delay, shouldFail = false) => () => 
    new Promise((resolve, reject) => setTimeout(() => {
        if (shouldFail) {
            reject(new Error(`任务 ${id} 失败了`));
        } else {
            resolve(`任务 ${id} 成功`);
        }
    }, delay));

const tasks = [
    create_task(1, 1000),         // 成功
    create_task(2, 500, true),    // 500ms 时失败
    create_task(3, 300),         // 成功
];

async function start() {
    const pool = new AsyncPoolIterator(2, tasks);
    
    for await (const result of pool) {
        // 只有成功的任务才会走到这里
        console.log(`外部迭代收到: ${result}`);
    }
    console.log("迭代顺利结束，未被错误中断");
}

start();
