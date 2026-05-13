class AsyncPoolIterator {
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

        // 1. 持续填充并发池
        while (this.executing.size < this.max && !this.done) {
            const { value: task, done } = this.taskIterator.next();
            
            if (done) {
                this.done = true;
                break;
            }

            // 执行任务并统一格式化返回值，确保不会触发 unhandled rejection
            const promise = Promise.resolve(task())
                .then(
                    value => ({ status: 'fulfilled', value }),
                    reason => ({ status: 'rejected', reason })
                )
                .then(result => {
                    // 任务完成后（无论成功/失败），从执行池中移除
                    this.executing.delete(promise);
                    return result;
                });

            this.executing.add(promise);
        }

        // 2. 检查结束条件
        if (this.executing.size === 0 && this.done) {
            return { value: undefined, done: true };
        }

        // 3. 竞争最快完成的任务（由于内部处理了 catch，此处 race 绝不会 reject）
        const fastestResult = await Promise.race(this.executing);
        
        return { value: fastestResult, done: false };
    }
}


const create_task = (id, delay, shouldFail = false) => () => 
    new Promise((resolve, reject) => setTimeout(() => {
        if (shouldFail) {
            reject(new Error(`任务 ${id} 发生异常`));
        } else {
            resolve(`任务 ${id} 数据`);
        }
    }, delay));

const tasks = [
    create_task(1, 1000),        // 成功
    create_task(2, 400, true),   // 400ms 后失败
    create_task(3, 300),        // 成功
];

async function start() {
    const pool = new AsyncPoolIterator(2, tasks);
    
    for await (const result of pool) {
        if (result.status === 'fulfilled') {
            console.log(`✅ 成功获取: ${result.value}`);
        } else {
            console.error(`❌ 捕获错误: ${result.reason.message}`);
        }
    }
    console.log("🏁 所有任务处理完毕");
}

start();
