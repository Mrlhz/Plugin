/**
 * 为了同时支持任务错误自动重试和动态追加新任务，我们需要对迭代器进行架构升级：
 * 1. 统一输入源：使用一个内部数组 this.taskQueue 替代原有的原生迭代器，无论是初始化传入的任务，还是后续动态追加的任务，都统一推入该队列中。
 * 2. 重试状态追踪：将任务包装为带有 retryCount 属性的对象，在任务失败时检查是否达到上限，未达到则重新推入队列。
 */

class AsyncPoolIterator {
    constructor(max, initialTasks = []) {
        this.max = max;
        this.executing = new Set();
        // 内部任务队列，存储结构：{ taskFn, retryCount, originalTask }
        this.taskQueue = []; 
        
        // 压入初始任务
        for (const task of initialTasks) {
            this.add(task);
        }
    }

    /**
     * 动态追加新任务
     * @param {Function} taskFn - 返回 Promise 的任务函数
     * @param {number} maxRetries - 该任务的最大重试次数，默认为 0
     */
    add(taskFn, maxRetries = 0) {
        this.taskQueue.push({
            taskFn,
            maxRetries,
            retryCount: 0
        });
    }

    [Symbol.asyncIterator]() {
        return this;
    }

    async next() {
        while (true) {
            // 1. 填充并发池：只要池子没满且队列里有任务，就持续取出并执行
            while (this.executing.size < this.max && this.taskQueue.length > 0) {
                const taskObj = this.taskQueue.shift();
                
                // 执行任务并绑定重试/返回逻辑
                const promise = Promise.resolve(taskObj.taskFn())
                    .then(
                        value => ({ status: 'fulfilled', value }),
                        reason => {
                            // 判断是否需要重试
                            if (taskObj.retryCount < taskObj.maxRetries) {
                                taskObj.retryCount++;
                                // 重新推入队列尾部，等待后续轮询执行
                                this.taskQueue.push(taskObj);
                                return { status: 'retrying', retryCount: taskObj.retryCount };
                            }
                            // 耗尽重试次数，正式宣告失败
                            return { status: 'rejected', reason };
                        }
                    )
                    .then(result => {
                        // 任务结束（或转入重试阶段）后，从当前执行池中移除
                        this.executing.delete(promise);
                        return result;
                    });

                this.executing.add(promise);
            }

            // 2. 检查结束条件：执行池为空，且队列中没有等待或正在重试的任务
            if (this.executing.size === 0 && this.taskQueue.length === 0) {
                return { value: undefined, done: true };
            }

            // 3. 竞争最快有结果的任务
            const fastestResult = await Promise.race(this.executing);
            
            // 4. 如果该任务进入了重试阶段，不向外部产出结果，继续下一轮循环
            if (fastestResult.status === 'retrying') {
                continue;
            }

            // 5. 产出最终成功或最终失败（重试次数耗尽）的结果
            return { value: fastestResult, done: false };
        }
    }
}


// 模拟一个会失败数次后成功的任务
const create_failing_task = (id, successAfterAttempts) => {
    let attempts = 0;
    return () => new Promise((resolve, reject) => {
        attempts++;
        setTimeout(() => {
            if (attempts < successAfterAttempts) {
                reject(new Error(`任务 ${id} 第 ${attempts} 次尝试失败`));
            } else {
                resolve(`任务 ${id} 在第 ${attempts} 次尝试时成功`);
            }
        }, 300);
    });
};

async function start() {
    // 初始化并发池，并发限制 2
    const pool = new AsyncPoolIterator(2);

    // 添加任务 1：最多重试 2 次（总共执行 3 次），它在第 3 次会成功
    pool.add(create_failing_task(1, 3), 2);

    // 添加任务 2：最多重试 1 次（总共执行 2 次），它在第 3 次才成功（因此会最终失败）
    pool.add(create_failing_task(2, 3), 1);

    // 启动迭代消费
    let hasAddedDynamicTask = false;

    for await (const result of pool) {
        if (result.status === 'fulfilled') {
            console.log(`✅ 迭代产出成功: ${result.value}`);
        } else {
            console.error(`❌ 迭代产出失败: ${result.reason.message}`);
        }

        // 模拟动态追加：当收到第一个结果时，动态追加任务 3
        if (!hasAddedDynamicTask) {
            console.log("➕ [动态追加] 检测到新需求，向池中追加任务 3");
            pool.add(create_failing_task(3, 1), 0); // 立刻成功的任务
            hasAddedDynamicTask = true;
        }
    }
    console.log("🏁 所有任务（含重试及动态追加）处理完毕");
}

start();
