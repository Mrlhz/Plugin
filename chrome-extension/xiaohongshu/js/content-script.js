/**
 * @link https://stackoverflow.com/questions/9515704/use-a-content-script-to-access-the-page-context-variables-and-functions
 */
function injectCustomScript(jsPath) {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL(jsPath) // chrome-extension://xxxxxx/js/inject-script.js
  script.onload = function () {
    console.log('load')
    this.parentNode.removeChild(this)
  };
  (document.head || document.documentElement).appendChild(script);
}

injectCustomScript('js/inject-script.js')
initCustomButton()


window.addEventListener('message', async function (e) {
  console.log(e);
  console.log(chrome)
  const cmdMap = {
    inject_script_to_content_script: 'content_script_to_background',
    inject_script_to_content_script__list: 'content_script_to_background__list'
  }
  if (e?.data?.cmd.startsWith('inject_script_to_content_script')) {
    await chrome.runtime.sendMessage({ cmd: cmdMap[e?.data?.cmd], url: location.href, result: e.data })
  }
}, false)

function initCustomButton() {
  if (document.getElementById('chrome_plugin_xhs_btn')) {
    return
  }
	const btn = document.createElement('div')
  btn.id = 'chrome_plugin_xhs_btn'
  btn.className = 'chrome_plugin_xhs_btn'
  btn.innerText = '获取列表'
  document.body.appendChild(btn)

  btn.addEventListener('click', function() {
    document.body.scrollIntoView({ behavior: "smooth", block: "end" })
    console.log('click!')
    window.postMessage({ cmd: 'content_script_to_inject_script' }, '*')
  }, false)
}
