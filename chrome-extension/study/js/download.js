import { convertToJPG } from './helper.js'

let url = 'http://localhost:3005/avmoo/movie';
// url = 'http://localhost:3005/avmoo/custom'

const starInputEl = document.getElementById('starInput')

document.querySelector('#requestBtn').addEventListener('click', (e) => {
  // getImagesList({ 'idols': '水卜さくら' })
  const inputValue = starInputEl ? starInputEl.value.trim() : ''
  if (inputValue) {
    getImagesList({ 'idols': inputValue })
  }
})

async function getImagesList(params) {
  const { data } = await axios.get(url, { params })
  console.log(data)
  await download(data.images)
}

async function download(data = []) {
  const tasks = data.slice(0).map(item => {
    const { av, name, url, dest } = item
    const filename = `${dest}/${convertToJPG(name)}`
    return chrome.downloads.download({ url, filename }).then(downloadId => {
      return { av, ...item, downloadId }
    })
  })
  const res = await Promise.allSettled(tasks)
  console.log(res)
}
