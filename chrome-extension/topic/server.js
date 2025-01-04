/**
 * @link https://nodejs.org/docs/latest/api/fs.html#fsexistssyncpath
 * @link https://zhuanlan.zhihu.com/p/695932500
 * @link https://github.com/penghuwan/body-parser-promise
 */

const fs = require('fs')
const path = require('path')

const http = require(`http`);
const url = require(`url`);

const server = http.createServer(async (req, res) => {
  // 第二个参数为 true，表示解析查询字符串
  const parsedUrl = url.parse(req.url, true);

  console.log(parsedUrl)

  // 检查请求方法和 URL 路径
  if (req.method === `POST` && parsedUrl.pathname === `/pathExists`) {
    // 设置响应头部，内容类型为 JSON
    res.setHeader(`Content-Type`, `application/json`);

    // 获取body
    const body = await parseRequest(req)

    // 简易bodyParser
    const data = JSON.parse(body)
    const result = await pathExists(data)
    console.log({ result })
    res.writeHead(200);
    res.end(JSON.stringify({
      msg: 'success',
      result
    }));
  } else {
    // 对于非 `/pathExists` 或非 POST 请求，返回fail
    res.writeHead(200);
    res.end(JSON.stringify({ msg: 'fail' }));
  }
});

// 服务器监听 8080 端口
server.listen(8080, () => {
  console.log(`Server is running on http://localhost:8080/`);
});

async function pathExists(list = []) {
  if (!Array.isArray(list)) {
    return list
  }
  const result = []
  for (const item of list) {
    const { url, downloadsLocation, filename } = item
    const { ext, name, dir } = path.parse(filename)
    const exts = format(item.exts, ext)
    
    const tasks = exts.map(ext => {
      const p = path.resolve(downloadsLocation, dir, name + ext)
      return !fs.existsSync(p)
    })
    const r = await Promise.all(tasks)
    // exts 数组包含的类型文件都不存在
    if (r.every(v => v)) {
      result.push(item)
    }
  }
  return result
}


function parseRequest(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', chunk => {
      chunks.push(chunk)
    })
    request.on('end', () => {
      // 目前只处理json类型
      const buffer = Buffer.concat(chunks)

      resolve(buffer)
    })

    request.on('error', err => {
      reject(err)
    })
  })
}

/**
 * 
 * @param {Array} exts 
 * @param {string} filename 
 * @returns 
 * @example
 * format(['.webp'], '.jpg')
 * => ['.webp', '.jpg']
 * 
 * format(['.webp'], '.webp')
 * => ['.webp']
 */
function format(exts = [], ext) {
  const result = [ext]
  if (Array.isArray(exts)) {
    result.push(...exts)
  }
  return [...new Set(result.filter(v => v))]
}

function formatData(str, contentType) {
  let result = '';
  switch (contentType) {
    case 'text/plain':
      result = str;
      break;
    case 'application/json':
      result = JSON.parse(str);
      break;
    default:
      break;
  }
  return result;
}
