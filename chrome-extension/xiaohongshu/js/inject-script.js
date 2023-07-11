function myScript() {
  console.log('load my script', this, window)
}


document.addEventListener('click', (e) => {
  console.log((window?.__INITIAL_STATE__?.note?.note?.value || window?.__INITIAL_STATE__?.note?.note || {}));
}, false)

console.log('send', window?.__INITIAL_STATE__?.note?.note?.value)
const val = { ...window?.__INITIAL_STATE__?.note?.note?.value }

if (Object.keys(val).length) {
  const result = JSON.parse(JSON.stringify(val))

  console.log(result)
  window.postMessage({
    cmd: 'inject_script_to_content_script',
    url: location.href,
    note: { ...result }
   }, '*')
}

// 发消息给bg存列表数据
if (location.href.includes('//www.xiaohongshu.com/user/profile')) {
  let result = JSON.parse(JSON.stringify(window?.__INITIAL_STATE__?.user?.notes?.value))
  if (Array.isArray(result)) {
    result = result.flat(1)
  }
  console.log(result.length)
  window.postMessage({
    cmd: 'inject_script_to_content_script__list',
    url: location.href,
    note: result
   }, '*')
}

