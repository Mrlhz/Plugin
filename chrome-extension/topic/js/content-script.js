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


const scrollToTop = (element) => element.scrollIntoView({ behavior: 'smooth', block: 'start' })

// 滚动到底部
const scrollToBottom = (element) => element.scrollIntoView({ behavior: 'smooth', block: 'end' })
// document.body.scrollIntoView({ behavior: 'smooth', block: 'start' })
// document.querySelector('body').scrollIntoView({ behavior: 'smooth', block: 'start' })

const backtopHtml = `
  <i class="el-icon el-backtop__icon">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><path fill="currentColor" d="M512 320 192 704h639.936z"></path></svg>
  </i>
`

if (!document.getElementById('el_backtop')) {
  const backtop = document.createElement('div');
  backtop.innerHTML = backtopHtml;
  backtop.id = 'el_backtop'
  backtop.className = 'el-backtop'
  // backtop.style= 'right: 20px; bottom: 20px;'
  document.body.appendChild(backtop);
  backtop.addEventListener('click', function(el) {
    console.log(el.target?.getBoundingClientRect())
    scrollToTop(document.body)
  }, false)
}
