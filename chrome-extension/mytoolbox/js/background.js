
chrome.contextMenus.create({
  title: "Copy",
  onclick: function () {
    // let file = copy()
    // console.log(0, file)
    // copyToClipboard(file)
  }
})

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log('收到来自content-script的消息：')
  console.log(request, sender, sendResponse)
  sendResponse('我是后台，我已收到你的消息：' + JSON.stringify(request))
})


function copyTable() {
  const contentTable = document.querySelector('.firstpost .t_msgfontfix table')
  if (contentTable) {
    console.log(contentTable)
    return contentTable
  }
}


/**
 * @description chrome 下复制到剪贴板
 * @param {*} text
 * @see https://github.com/zxlie/FeHelper/blob/15d3be06233106a2536601da06f5649eb39fc1ed/apps/json-format/format-lib.js#L179
 */
function copyToClipboard(text) {
  let input = document.createElement('textarea')
  input.style.position = 'fixed'
  input.style.opacity = 0
  input.value = text
  document.body.appendChild(input)
  input.select()
  document.execCommand('Copy')
  document.body.removeChild(input)
}