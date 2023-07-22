function myScript() {
  console.log('load my script', this, window)
}


document.addEventListener('click', (e) => {
  console.log((window?.__INITIAL_STATE__?.note?.note?.value || window?.__INITIAL_STATE__?.note?.note || {}));
}, false)

console.log('send', window?.__INITIAL_STATE__?.note?.noteDetailMap)

function saveNoe() {
  const noteDetailMap = { ...window?.__INITIAL_STATE__?.note?.noteDetailMap }
  const [{ note }] = Object.values(noteDetailMap)
  if (note) {
    const result = JSON.parse(JSON.stringify(note))
  
    console.log(result)
    window.postMessage({
      cmd: 'inject_script_to_content_script',
      url: location.href,
      note: { ...result }
     }, '*')
  }
}

if (location.href.includes('//www.xiaohongshu.com/explore/')) {
  saveNoe()
}

function saveList() {
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
}

saveList()


window.addEventListener('message', async function (e) {
  console.log(e);
  if (e?.data?.cmd.startsWith('content_script_to_inject_script')) {
    saveList()
  }
}, false)
