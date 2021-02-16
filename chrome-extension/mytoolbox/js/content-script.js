console.log('contentTable', document.querySelector('.firstpost .t_msgfontfix table'))

document.addEventListener('DOMContentLoaded', function () {
  const contentTable = document.querySelector('.firstpost .t_msgfontfix table')

  if (contentTable) {
    console.log(contentTable)

    chrome.runtime.sendMessage({ greeting: '你好，我是content-script呀，我主动发消息给后台！', contentTable }, function (response) {
      console.log('收到来自后台的回复：' + response)
    })
  }
})