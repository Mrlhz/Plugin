import { executeScript, getSearchParams, getLocalStorage } from '../helper.js'
import { getWellList } from '../dom.js'

export async function newTabs({ currentTab, allTabs }, options = {}) {
  const { filter = false } = options
  const allTabUrls = allTabs.map(item => item.url)
  const [{ frameId, result }] = await executeScript(currentTab, getWellList)
  console.log(result)
  let filterResult = result
  if (filter) {
    filterResult = await filterTabs(result)
  }
  const task = filterResult
    .filter(item => !allTabUrls.includes(item.url))
    .map(item => chrome.tabs.create({ url: item.url }))

  const response = await Promise.all(task)
  console.log(response, { filterResult })
}

// 过滤出未下载的
async function filterTabs(urls = []) {
  const result = []
  for (const item of urls) {
    const { url } = item
    const d = await isDownload({ url })
    if (!d) {
      result.push(item)
    }
  }
  return result
}

async function isDownload({ url, viewkey } = {}) {
  let _viewkey = viewkey;
  if (url) {
    _viewkey = getSearchParams(url).get('viewkey')
  }
  if (!_viewkey) {
    return false
  }
  const { downloaded } = await getLocalStorage(_viewkey)
  console.log({ downloaded })
  return downloaded
}
