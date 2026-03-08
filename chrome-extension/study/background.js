
import menuInit from './js/contextMenus.js'
import commandInit, { downloadImageList } from './js/commands.js'

import { cacheName } from './config.js'

import blogMenuInit from './js/menus/busjav.blog.js'

import { downloadMovieImageList } from './js/core/downloadManage.js'

import './js/event.js'


menuInit()
commandInit()
blogMenuInit()
console.log(cacheName)

// background.js


chrome.action.onClicked.addListener(tab => {
  // 仅处理 target 页面
  const mapUrl = new Map([
    ['www.target.com', true],
  ]);
  if (!mapUrl.has(new URL(tab.url).hostname)) {
    console.warn('Not on JavBus page');
    return;
  }

  downloadImageList().then(res => {
    console.log(res)
  });

  // 向当前标签页的 content script 请求图片
  chrome.tabs.sendMessage(tab.id, { action: 'getCoverImage' }, response => {
    if (chrome.runtime.lastError) {
      console.log('Message error:', chrome.runtime.lastError);
      return;
    }

    if (response?.error) {
      console.error('Content script error:', response.error);
      return;
    }

    if (response) {
      downloadMovieImageList(response).then(result => {
        console.log('Download result:', result, response);
      }).catch(err => {
        console.log('Download error:', err);
      });
    }
  });
});
