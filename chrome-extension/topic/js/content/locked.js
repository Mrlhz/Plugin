window.MyExtension = window.MyExtension || {};

(function() {

  // 纯粹的检测函数：如果当前页被锁，只管记录到存储中
  window.MyExtension.checkLocked = async function() {
    const params = new URLSearchParams(window.location.search);
    const currentTid = params.get('tid');
    
    if (!currentTid) return;

    // 检查当前帖子页面是否存在屏蔽/锁定元素
    const isPageLockedNow = !!document.querySelector(".postmessage.firstpost .locked");

    if (isPageLockedNow) {
      await chrome.storage.local.set({ [`locked_${currentTid}`]: { isLocked: true } });
      console.log(`【数据采集】当前帖子(TID: ${currentTid})已被屏蔽，已成功同步至本地数据库`);
    }
  };

})();
