function sendMessageToContentScript(message, callback) {
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, message, function (response) {
      if (callback) callback(response)
    })
  })
}




document.querySelector('#copy').addEventListener('click', function (e) {
  sendMessageToContentScript({
    cmd: 'test',
    value: '你好，我是popup！'
  }, function (response) {
    console.log('来自content的回复：' , response)
    console.log('来自content的回复：' , parse(response))
    const res = parse(response)
    const title = res.title.replace(/[\\\/\:\*\?\"\<\>\|]/g, '-')
    copyToClipboard(`${title}-${res.time}`)
  })
})


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

function parse(content) {
  try {
    return JSON.parse(content)
  } catch (e) {
    return ''
  }
}