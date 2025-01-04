
// Downloads Location
export const DOWNLOADSLOCATION = 'downloadsLocation'

export async function pathExists(list = [], options = {}) {
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
    notice({ message: 'pathExists服务未启用' })
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

export function notice(options = {}) {
  return chrome.notifications.create({
    type: 'basic',
    title: '通知',
    // message: 'pathExists服务未启用',
    iconUrl: '../images/topic.jpg',
    ...( options || {})
  });
}
