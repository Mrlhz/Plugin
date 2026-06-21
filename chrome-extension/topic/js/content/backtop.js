window.MyExtension = window.MyExtension || {};

window.MyExtension.addBacktop = function() {
  const scrollToTop = (element) => element.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // 滚动到底部
  const scrollToBottom = (element) => element.scrollIntoView({ behavior: 'smooth', block: 'end' });
  // document.body.scrollIntoView({ behavior: 'smooth', block: 'start' })
  // document.querySelector('body').scrollIntoView({ behavior: 'smooth', block: 'start' })

  const backtopHtml = `
    <i class="el-icon el-backtop__icon top">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><path fill="currentColor" d="M512 320 192 704h639.936z"></path></svg>
    </i>
    <i class="el-icon el-backtop__icon bottom">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><path fill="currentColor" d="m192 384 320 384 320-384z"></path></svg>
    </i>
  `

  if (!document.getElementById('el_backtop')) {
    const backtop = document.createElement('div');
    backtop.innerHTML = backtopHtml;
    backtop.id = 'el_backtop'
    backtop.className = 'el-backtop'
    // backtop.style= 'right: 20px; bottom: 20px;'
    document.body.appendChild(backtop);
    // backtop.addEventListener('click', function(el) {
    //   console.log(el.target?.getBoundingClientRect(), el.target)
    //   scrollToTop(document.body)
    // }, false);

    document.querySelector('#el_backtop .top').addEventListener('click', function(el) {
      scrollToTop(document.body)
    }, false);
    document.querySelector('#el_backtop .bottom').addEventListener('click', function(el) {
      scrollToBottom(document.body)
    }, false);
  }
};
