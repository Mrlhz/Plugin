
export function executeScript(tab, func, params = ['task']) {
  return new Promise(resolve => {
    chrome.scripting.executeScript({ target: { tabId: tab.id }, func: func, args: params }, (...args) => {
      console.log('args')
      resolve(...args)
    })
  })
}

export const wait = (delay) => new Promise(resolve => { setTimeout(resolve, delay) })

export async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true }
  let [tab] = await chrome.tabs.query(queryOptions)
  return tab
}

export async function getAllWindow() {
  let queryOptions = {}
  let tabs = await chrome.tabs.query(queryOptions)
  return tabs
}
