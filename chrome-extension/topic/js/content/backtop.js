window.MyExtension = window.MyExtension || {};

(function() {
  
  // 注册到全局命名空间
  window.MyExtension.addBacktop = function() {
    // 1. 检查是否已经存在，避免 MutationObserver 重复添加
    if (document.getElementById('el_backtop')) return;

    // 2. 更加健壮的滚动目标选择
    // 优先使用更通用的 document.documentElement (html标签) 来确保所有网站都能平滑滚动
    const scrollTarget = document.documentElement || document.body;
    
    const scrollToTop = (element) => element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const scrollToBottom = (element) => element.scrollIntoView({ behavior: 'smooth', block: 'end' });

    const backtopHtml = `
    <i class="el-icon el-backtop__icon top">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><path fill="currentColor" d="M512 320 192 704h639.936z"></path></svg>
      </i>
    <i class="el-icon el-backtop__icon bottom">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><path fill="currentColor" d="m192 384 320 384 320-384z"></path></svg>
      </i>
    `;

    // 3. 创建并配置外部容器
    const backtop = document.createElement('div');
    backtop.id = 'el_backtop';
    backtop.className = 'el-backtop';
    backtop.innerHTML = backtopHtml;
    
    // 如果没有在 CSS 文件里写样式，可以取消下面这行注释来提供基础浮动样式
    // backtop.style = "position: fixed; right: 40px; bottom: 40px; z-index: 9999; display: flex; flex-direction: column; gap: 8px;";

    document.body.appendChild(backtop);

    // 4. 事件绑定（直接在生成的 DOM 上用 querySelector 查找，更安全）
    const topBtn = backtop.querySelector('.top');
    const bottomBtn = backtop.querySelector('.bottom');

    if (topBtn) {
      topBtn.addEventListener('click', function(e) {
        e.stopPropagation(); // 阻止冒泡，防止触发 content-script 中的全局 click 监听
        scrollToTop(scrollTarget);
      }, false);
    }

    if (bottomBtn) {
      bottomBtn.addEventListener('click', function(e) {
        e.stopPropagation(); // 阻止冒泡
        scrollToBottom(scrollTarget);
      }, false);
    }

    // 5. 联动滚动显隐逻辑（可选：如果您希望像 ElementUI 一样，滚动一定距离才显示整个控制面板）
    /*
    backtop.style.display = 'none'; // 初始隐藏
    const toggleVisibility = () => {
      backtop.style.display = window.scrollY > 300 ? 'flex' : 'none';
    };
    window.addEventListener('scroll', toggleVisibility);
    toggleVisibility(); // 初始化检查一次
    */
  };

})();
