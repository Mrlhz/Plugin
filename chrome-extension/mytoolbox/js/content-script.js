// console.log('contentTable', document.querySelector('.firstpost .t_msgfontfix table'))

document.addEventListener('DOMContentLoaded', function () {
  const magnetContent = document.querySelectorAll('a[href*="magnet:?xt=urn:btih"]')

  if (magnetContent) {
    const magnet = Array.from(magnetContent).map(item => item.getAttribute('href'))
    console.log(magnetContent, magnet)
    sendMessage(magnet)
  }
  const contentTable = document.querySelector('.firstpost .t_msgfontfix')
  console.log(contentTable)
  if (contentTable) {
    sendMessage({ message: 'contentTable', data: contentTable.innerHTML })
  }
})


function sendMessage(data) {
  chrome.runtime.sendMessage(data, function (response) {
    console.log('收到来自后台的回复：', response)
  })
}


/**
 *  防止ajax异步延时加载
 */

document.querySelectorAll('.ad-table').forEach((item) => item.style.display = 'none')
