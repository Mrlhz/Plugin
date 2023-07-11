import { pathParse, safeFileName, sleep } from './utils.js'


export async function downloadImageBatch(note) {
  if (!note || typeof note !== 'object') {
    console.log('fail: ', note)
    return
  } 
  const { user, title, imageList } = note
  const { nickname } = user
  const list = imageList.map(image => {
    const url = `https://sns-img-qc.xhscdn.com/${image.traceId}`
    const { name, ext, base } = pathParse(url)
    const safeTitle = safeFileName(title)
    return {
      url,
      filename: ext ? `${nickname}/${safeTitle}/${base}` : `${nickname}/${safeTitle}/${name}.jpg`
    }
  })
  const tasks = list.map(({ url, filename }) => {
    return chrome.downloads.download({ url, filename }).then(downloadId => {
      return { downloadId }
    })
  })
  return Promise.allSettled(tasks)
}

// 批量下载
export async function batchDownload(tab) {
  const storage = await chrome.storage.local.get(tab.url)
  if (!storage) {
    return
  }

  const list = storage[tab.url]
  const taskList = list.map(({ id }) => chrome.storage.local.get(`https://www.xiaohongshu.com/explore/${id}`))
  const result = await Promise.all(taskList).then(res => res.flat(1).map(item => Object.values(item)[0]))
  console.log(result)


  for (let index = 0, len = result.length; index < len; index++) {
    const note = result[index];
    if (note) {
      const response = await chrome.runtime.sendMessage({ cmd: 'background_to_offscreen__batch', result: note })
      await downloadImageBatch(note)
      await sleep(1500)
    }
  }
}


export function batchDownloadJSONFile({ url, note }) {
  if (!note) {
    console.log('download json file fail:', note)
    return
  }
  const { user, title } = note
  const { nickname } = user
  const filePath = `${nickname}/${safeFileName(title)}`
  const filename = `${filePath}.json`
  chrome.downloads.download({ url: url, filename }).then(downloadId => {
    return { downloadId }
  })
}
