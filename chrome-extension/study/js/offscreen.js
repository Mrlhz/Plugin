
async function main(result) {
  const text = JSON.stringify(result, null, 2)
  const blob = new Blob([text], {
    // type: "text/plain"
    type: "application/json"
  })
  const url = URL.createObjectURL(blob)
  chrome.runtime.sendMessage({ cmd: 'offscreen_to_background', url, result })
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log('消息：', request, sender, sendResponse)
  const { cmd, result } = request
  if (cmd === 'background_to_offscreen') {
    main(result)
  }
  sendResponse({ message: '我是 offscreen，已收到你的消息：', request })
})
