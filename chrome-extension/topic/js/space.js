import { getSearchpost } from './dom.js'
import { parseQuery } from './utils.js'

export async function outputSearchpost(tab) {
  const data = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: getSearchpost, args: [] })
    .then(([{ documentId, frameId, result }]) => result);

  const { search } = new URL(tab.url)
  const { uid } = parseQuery(search)
  if (uid) {
    const file = `D:\\Downloads\\mask\\91论坛\\markdown\\data\\${uid}.json`
  
    await outputJSON(file, JSON.stringify(data, null, 2));
  }

}

export async function outputJSON(...args) {
  const method = 'writeFile';
  const result = await fetch(`http://localhost:8080/fsPromises/${method}`, {
    method: 'post',
    // https://nodejs.org/docs/latest/api/fs.html#fspromiseswritefilefile-data-options
    // file, data, options
    body: JSON.stringify(args),
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
    }
  })
  .then(res => res.json())
  .catch(error => {
    console.log(error)
  })

  return result
}
