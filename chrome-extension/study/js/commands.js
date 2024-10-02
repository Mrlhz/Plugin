/**
 * @description chrome.commands
 */

import { downloadMovieImageList, setupOffscreenDocument } from './core/downloadManage.js'
import { getCurrentTab } from './helper.js'


export default function commandInit() {
  chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'RUN_DOWNLOAD_IMAGE_LIST') {
      const currentTab = await getCurrentTab()
      const result = await downloadMovieImageList({ currentTab })
      await setupOffscreenDocument()
      chrome.runtime.sendMessage({ cmd: 'background_to_offscreen', result }, function (response) {
        console.log('commands: 收到来自 offscreen 的回复：', response)
      })
    }
  })
}
