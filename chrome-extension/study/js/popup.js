
let url = 'http://localhost:3005/avmoo/movie';
url = 'http://localhost:3005/avmoo/custom'

document.querySelector('#requestBtn').addEventListener('click', (e) => {
  console.log('self', this)
  // init({ 'idols': '水卜さくら' })
  init({ 'idols': 'さつき芽衣' })
})


async function init(params) {
  const { data } = await axios.get(url, { params })
  console.log(data)
  await download(data.images)
}


async function download(data = []) {
  const tasks = data.slice(0).map(item => {
    const { av, name, url, dest } = item // 
    // {
    //   "av": "GVH-345",
    //   "name": "GVH-345.jpg",
    //   "url": "https://www.busjav.fun/pics/cover/8pq9_b.jpg",
    //   "dest": "さつき芽衣/GVH-345",
    //   "sample": ""
    // }
    const filename = `${dest}/${name}`
    return chrome.downloads.download({ url, filename }).then(downloadId => {
      return { av, ...item, downloadId }
    })
  })
  const res = await Promise.all(tasks)
  console.log(res)
}