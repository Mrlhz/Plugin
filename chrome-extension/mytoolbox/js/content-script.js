// console.log('contentTable', document.querySelector('.firstpost .t_msgfontfix table'))

// document.addEventListener('DOMContentLoaded', function () {
//   const magnetContent = document.querySelectorAll('a[href*="magnet:?xt=urn:btih"]')

//   if (magnetContent) {
//     const magnet = Array.from(magnetContent).map(item => item.getAttribute('href'))
//     console.log(magnetContent, magnet)
//     sendMessage(magnet)
//   }
//   const contentTable = document.querySelector('.firstpost .t_msgfontfix')
//   console.log(contentTable)
//   if (contentTable) {
//     sendMessage({ message: 'contentTable', data: contentTable.innerHTML })
//   }
// })


// function sendMessage(data) {
//   chrome.runtime.sendMessage(data, function (response) {
//     console.log('收到来自后台的回复：', response)
//   })
// }

// 注意，必须设置了run_at=document_start 此段代码才会生效
document.addEventListener('DOMContentLoaded', function() {
  injectCustomJs()
})

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // console.log(sender.tab ?"from a content script:" + sender.tab.url :"from the extension")
  if (request.cmd == 'test') console.log(request.value, request)
  let title = document.querySelector('#videodetails.videodetails-yakov .login_register_header')
  let time = document.querySelector('#videodetails-content .title-yakov')
  title = title ? title.innerText.trim() : ''
  time = time ? time.innerText.trim() : ''

  const data = JSON.stringify({ title, time })
  sendResponse(data)
})

// 向页面注入JS
function injectCustomJs(jsPath) {
  jsPath = jsPath || 'js/inject-script.js'
  var temp = document.createElement('script')
  temp.setAttribute('type', 'text/javascript')
  // 获得的地址类似：chrome-extension://ihcokhadfjfchaeagdoclpnjdiokfakg/js/inject.js
  temp.src = chrome.runtime.getURL(jsPath)
  temp.onload = function () {
    // 放在页面不好看，执行完后移除掉
    this.parentNode.removeChild(this)
  }
  document.body.appendChild(temp)
}

/**
 *  防止ajax异步延时加载
 */

// document.querySelectorAll('.ad-table').forEach((item) => item.style.display = 'none')
