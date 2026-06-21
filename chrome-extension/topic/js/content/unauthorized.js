window.MyExtension = window.MyExtension || {};

(function() {

  // 纯粹的检测函数：如果当前页提示无权限，只管记录到存储中
  window.MyExtension.checkUnauthorized = async function() {
    const params = new URLSearchParams(window.location.search);
    const currentTid = params.get('tid');
    
    if (!currentTid) return;

    // 检查当前帖子页面是否存在无权限的错误提示元素
    const hasErrorAlert = !!document.querySelector("#wrap .alert_error");
    const errorText = hasErrorAlert ? document.querySelector("#wrap .alert_error").innerText : '';

    if (hasErrorAlert && errorText.includes('需要满足以下条件才可访问这个版块')) {
      // 存入 storage，使用专门的前缀 unauthorized_ 防止数据混淆
      await chrome.storage.local.set({ [`unauthorized_${currentTid}`]: { isUnauthorized: true } });
      console.log(`【数据采集】当前帖子(TID: ${currentTid})提示无权限访问，已成功同步至本地数据库`);
    }
  };

})();
