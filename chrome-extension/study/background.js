
import menuInit from './js/contextMenus.js'
import commandInit, { downloadImageList } from './js/commands.js'

import { cacheName } from './config.js'

import blogMenuInit from './js/menus/busjav.blog.js'

import './js/event.js'


menuInit()
commandInit()
blogMenuInit()
console.log(cacheName)

// background.js


chrome.action.onClicked.addListener(tab => {
  // 仅处理 target 页面
  if (!tab.url?.includes('target.com')) {
    console.warn('Not on target page');
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

    if (response?.dataUrl) {
      chrome.downloads.download({
        url: response.dataUrl,
        filename: response.filename,
        saveAs: false
      }, downloadId => {
        if (chrome.runtime.lastError) {
          console.error('Download failed:', chrome.runtime.lastError);
        } else {
          console.log('Download started, ID:', downloadId);
        }
      });
    }
  });
});
