import { getAllWindow } from './helper.js'
import './download.js'

chrome.runtime.sendMessage({ msg: '你好，我是tabs呀，我主动发消息给后台'}, function(response) {
	console.log('收到来自后台的回复：', response)
  render()
})


async function render() {
  const tabs = await getAllWindow()

  const html = renderHTML(tabs)

  const tabsDom = document.getElementById('tabs')

  tabsDom.innerHTML = html

  console.log(tabs)
}

function renderHTML(list = []) {
  return list.map(({ title, url }) => {
    return `<div class="tab"><a href="${url}" target="_blank">${title}</a></div>`
  }).join('')
}
