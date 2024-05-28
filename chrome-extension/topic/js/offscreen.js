
const BACKGROUND_TO_OFFSCREEN = 'BACKGROUND_TO_OFFSCREEN'
const OFFSCREEN_TO_BACKGROUND = 'OFFSCREEN_TO_BACKGROUND'
const TOPIC_KEY = 'topic'

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log('消息：', request, sender, sendResponse)
  const { cmd, result } = request
  if (cmd === BACKGROUND_TO_OFFSCREEN) {
    create(result)
  }
  sendResponse({ message: '我是 offscreen，已收到你的消息：', request })
})

async function create(result = []) {
  for (let index = 0; index < result.length; index++) {
    const element = result[index];
    const text = element[TOPIC_KEY]
    const blob = new Blob([text], {
      // type: "text/plain"
      // type: "application/json"
      type: "text/markdown"
    })
    const url = URL.createObjectURL(blob)

    element.blob = url
  }

  await chrome.runtime.sendMessage({ cmd: OFFSCREEN_TO_BACKGROUND, result })
}

function setImageURL(html) {

  const div = document.createElement('div')
  div.innerHTML = html;

  [...div.querySelectorAll('img')]
}