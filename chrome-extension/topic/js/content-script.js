/**
 * @link https://stackoverflow.com/questions/9515704/use-a-content-script-to-access-the-page-context-variables-and-functions
 */
function injectCustomScript(jsPath) {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL(jsPath) // chrome-extension://xxxxxx/js/inject-script.js
  script.onload = function () {
    this.parentNode.removeChild(this)
  };
  (document.head || document.documentElement).appendChild(script);
}

injectCustomScript('js/inject-script.js')


window.addEventListener('message', async function (e) {
}, false)

document.addEventListener('click', async function() {
  await setClass()
}, false)

async function setClass() {
  const links = [...document.querySelectorAll('a[href*="viewthread.php?tid="]')]
  const storage = await chrome.storage.local.get(null)
  for (const link of links) {
    const href = link.getAttribute('href')
    if (href && href.includes('&page=')) {
      continue
    }
    
    const { tid } = parseQuery(href.split('?')[1])
    if (storage[tid]) {
      // link.className = ''
      link.classList.add('downloaded')
    }
  }
}

function parseQuery(search = '') {
  const query = {}
  const searchParams = new URLSearchParams(search);

  for (const [key, value] of searchParams.entries()) {
    query[key] = value
  }
  return query
}
