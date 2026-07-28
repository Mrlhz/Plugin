// test.js
import assert from 'assert';
import { mockArticles } from './mockData.js';
// 导入核心功能函数与策略类
import { generateMediaTasks, BlogStrategy } from '../core/namer.js';

// 模拟外部依赖 cleaner.js 的底层表现，确保测试可控
import { cleanString, extractFileName } from '../core/cleaner.js';

// cleanString = (str) => str ? str.trim() : '';
// extractFileName = (urlStr, defaultName) => {
//   return urlStr ? urlStr.split('/').pop() : defaultName;
// };

function runTests() {
  console.log('🚀 开始执行统一多媒体任务归一化生成器原生测试...\n');
  const strategy = new BlogStrategy();

  // ========================================================
  // 测试用例 1: 验证标准多媒体博客解析与多态资产处理器
  // ========================================================
  (() => {
    console.log('🧪 [Case 1] 测试标准博客解析 (非法字符、多资产、优先级控制)...');
    
    // 1. 运行策略解析
    const parsedData = strategy.parse(mockArticles.standardBlog, { customDir: 'my_downloads' });
    
    assert.strictEqual(parsedData.id, '1024');
    assert.strictEqual(parsedData.authorName, '极客架构师');
    
    // 2. 验证结合了 cleanString 的真实标题输出
    // 源码逻辑：
    // rawTitle = cleanString("深入浅出/ 现代流媒体架构选型*设计|__必看?") -> "深入浅出_ 现代流媒体架构选型_设计___必看_"
    // safeTitle = [`${rawTitle}__1024`].filter().join('_').replace(...) -> 末尾的 ? 变 _
    const expectedTitle = "深入浅出_ 现代流媒体架构选型_设计___必看___1024";
    assert.strictEqual(parsedData.title, expectedTitle);

    // 3. 验证子任务数量 (1个html + 2个图片 = 3个 subTasks)
    assert.strictEqual(parsedData.tasks.length, 3);

    // 4. 验证 HTML 处理器注入路径与硬编码优先级 (10)
    const htmlTask = parsedData.tasks.find(t => t.type === 'html');
    assert.ok(htmlTask, '应当包含 HTML 子任务');
    assert.strictEqual(htmlTask.priority, 10);
    assert.strictEqual(htmlTask.filename, `my_downloads/极客架构师/${expectedTitle}.html`);

    // 5. 验证普通图片处理器路径与普通图片优先级 (5)
    const jpgTask = parsedData.tasks.find(t => t.filename.endsWith('cover.jpg'));
    assert.ok(jpgTask, '应当包含 JPG 图片子任务');
    assert.strictEqual(jpgTask.priority, 5);
    assert.strictEqual(jpgTask.filename, `my_downloads/极客架构师/images/cover.jpg`);

    // 6. 验证 GIF 图片动态优先级降低逻辑 (0)
    const gifTask = parsedData.tasks.find(t => t.filename.endsWith('animation.gif'));
    assert.ok(gifTask, '应当包含 GIF 图片子任务');
    assert.strictEqual(gifTask.priority, 0);

    // 7. 将解析出的标准子任务，投入标准的任务弹夹生成器 `generateMediaTasks` 验证
    const finalTasks = generateMediaTasks(parsedData);
    assert.strictEqual(finalTasks.length, 3, '最终生成的下载任务数量应与子任务数一致');
    
    // 8. 验证解耦的文件名及结构归一化
    const firstTask = finalTasks[0];
    assert.strictEqual(firstTask.itemId, '1024');
    assert.strictEqual(firstTask.platform, 'blog');
    assert.strictEqual(firstTask.conflictAction, 'overwrite');
    assert.strictEqual(typeof firstTask.currentUrlIndex, 'number');
    assert.strictEqual(firstTask.filename, htmlTask.filename); // 验证完美透传

    console.log('✅ [Case 1] 成功通过！');
  })();

  // ========================================================
  // 测试用例 2: 验证多页博客命名切片规则
  // ========================================================
  (() => {
    console.log('\n🧪 [Case 2] 测试多页/分页博客命名逻辑...');
    
    const parsedData = strategy.parse(mockArticles.multiPageBlog);
    
    // 验证多页拼接规则：${title}__${id}_page${page}
    const expectedMultiPageTitle = "流媒体长篇小说__5678_page3";
    assert.strictEqual(parsedData.title, expectedMultiPageTitle);
    
    // 应该只有 1 个 html 任务
    assert.strictEqual(parsedData.tasks.length, 1);
    assert.strictEqual(parsedData.tasks[0].type, 'html');
    
    console.log('✅ [Case 2] 成功通过！');
  })();

  // ========================================================
  // 测试用例 3: 验证异常/损坏数据的防崩溃守卫
  // ========================================================
  (() => {
    console.log('\n🧪 [Case 3] 测试损坏博客数据与空参数的防崩溃机制...');
    
    // 1. 缺失 ID 触发策略熔断
    const parsedData = strategy.parse(mockArticles.corruptedBlog);
    assert.strictEqual(parsedData, null);
    
    // 2. 传入完全空的对象或空参数安全熔断
    assert.strictEqual(strategy.parse(null), null);
    assert.strictEqual(strategy.parse(undefined), null);

    // 3. 验证 generateMediaTasks 输入空对象的兜底
    const emptyTasks = generateMediaTasks(undefined);
    assert.ok(Array.isArray(emptyTasks));
    assert.strictEqual(emptyTasks.length, 0);

    console.log('✅ [Case 3] 成功通过！');
  })();

  console.log('\n🎉 所有本地原生测试全部通过！代码与断言100%完美契合。');
}

// 启动测试
try {
  runTests();
} catch (error) {
  console.error('\n❌ 测试失败，断言未通过：');
  console.error(error.stack);
  process.exit(1);
}
