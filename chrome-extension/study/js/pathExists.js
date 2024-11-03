
export async function pathExists(list = [], options = {}) {
  const DOWNLOADSLOCATION = 'downloadsLocation'
  // Downloads Location
  let { dir } = options
  if (!dir) {
    dir = 'D:\\Downloads'
  }

  list.forEach(item => {
    Reflect.set(item, DOWNLOADSLOCATION, dir);
  })

  const { result } = await fetch('http://localhost:8080/pathExists', {
    method: 'post',
    body: JSON.stringify(list),
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then(res => res.json())
  .catch(error => {
    console.log(error)
    let options = {
      type: 'basic',
      title: '通知',
      message: 'pathExists服务未启用',
      iconUrl: '../images/icon-small.png'
    };
    chrome.notifications.create(options);
    return { result: [] }
  })

  if (!Array.isArray(result)) {
    return []
  }

  // chrome.downloads.download 接收自定义字段会报错
  result.forEach(item => {
    Reflect.deleteProperty(item, DOWNLOADSLOCATION)
  })

  return result
}