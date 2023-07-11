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
