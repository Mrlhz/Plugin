import { convertToJPG } from './helper.js'
import { Downloads } from '../config.js'

let url = 'http://localhost:3005/avmoo/movie';
// url = 'http://localhost:3005/avmoo/custom'


const starInputEl = document.getElementById('starInput')

document.querySelector('#requestBtn').addEventListener('click', (e) => {
  // getImagesList({ 'idols': '水卜さくら' })
  const inputValue = starInputEl ? starInputEl.value.trim() : ''
  const idolsEl = document.getElementById('idols')
  const paramKey = idolsEl.checked ? 'idols' : 'series'
  if (inputValue) {
    getImagesList({ [paramKey]: inputValue })
  }
})

document.querySelector('#checkboxApp').addEventListener('click', (e) => {
  const target = e.target
  if (target.matches('input')) {
    const id = target.getAttribute('id')
    const checked = target.checked
    const isIdols = id === 'idols'
    const other = document.getElementById(isIdols ? 'series' : 'idols')
    console.log(checked, id, other)
    other.checked = !checked
  }
})

async function getImagesList(params) {
  const { data } = await axios.get(url, { params })
  const exists = await fsManage('pathExists', Downloads.location)
  console.log(data)
  if (exists) {
    await download(data.images, { size: 20 })
  }
  if (!exists) {
    console.log({ msg: `${Downloads.location} not exist` } )
  }
}

const progressEl = document.querySelector('#progress-wrap progress')
const progressContentEl = document.querySelector('#progress-content')
const progressPercentEl = document.querySelector('#progress-percent')

async function download(data = [], options = {}) {
  const { size = 20 } = options
  progressEl.style.display = data.length ? 'block' : 'none'

  const result = []
  for (let index = 0, l = data.length; index < l; index += size) {
    if (index === 0) {
      progressManage({ value: 0, max: l, text: `0 / ${l}`, percent: `${percent(0, l)}` })
    }
    // 1
    const tasks = data.slice(index, index + size).map(item => chromeDownload(item))
    const downloadItems = await Promise.allSettled(tasks)
    result.push(...downloadItems)

    // 2
    // const item = data[index]
    // const downloadItem = await chromeDownload(item)
    // result.push(downloadItem)

    const cur = Math.min(index + size + 1, l)
    progressManage({
      value: cur,
      max: l,
      text: `${cur} / ${l}`,
      percent: `${percent(cur, l)}`
    })
  }
  console.log(result)
}

function chromeDownload(item = {}) {
  const { av, name, url, dest } = item
  const filename = `${dest}/${convertToJPG(name)}`
  return chrome.downloads.download({ url, filename }).then(downloadId => {
    return { av, ...item, downloadId }
  })
}

async function fsManage(method, ...args) {
  let url = 'http://localhost:3005/avmoo/fs'
  const { data } = await axios.post(url, {
    method,
    params: args
  })

  console.log(data)
  return data
}

function progressManage({ value, max, text, percent }) {
  if (!progressEl) return

  progressEl.setAttribute('value', value)
  progressEl.setAttribute('max', max)
  progressEl.innerText = percent
  progressContentEl.innerText = text
  progressPercentEl.innerText = percent
}

function percent(n1, n2) {
  return Math.round(n1 / n2 * 10000) / 100 + '%'
}
