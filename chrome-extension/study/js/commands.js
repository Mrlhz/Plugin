/**
 * @description chrome.commands
 */

import { getMovieImageList, downloadMovieImageList, setupOffscreenDocument } from './core/downloadManage.js'
import { getCurrentTab } from './helper.js'


export default function commandInit() {
  chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'RUN_DOWNLOAD_IMAGE_LIST') {
      await downloadImageList();
      // console.log('copyToClipboard', result)
      // 不生效
      // chrome.runtime.sendMessage({ cmd: 'background_to_content', result }, function (response) {
      //   console.log('commands: 收到来自 content-script 的回复：', response)
      // })
    }
  })
}

export async function downloadImageList() {
  const currentTab = await getCurrentTab();
  const res = await getMovieImageList({ currentTab });
  const result = await downloadMovieImageList(res);
  console.log('[downloadImageList]', result);
  await setupOffscreenDocument()
  chrome.runtime.sendMessage({ cmd: 'background_to_offscreen', result }, function (response) {
    console.log('commands: 收到来自 offscreen 的回复：', response)
  });
  return result;
}
