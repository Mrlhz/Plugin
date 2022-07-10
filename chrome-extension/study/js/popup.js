/**
 * @description 新标签打开tab页面
 */
document.querySelector('#openNewTabBtn').addEventListener('click', (e) => {
  createTab()
})

async function createTab() {
  const url = chrome.runtime.getURL('../tabs.html')

  const tab = await chrome.tabs.create({ url })

}
