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
    const result = pathExists(data)
    console.log({ result })
    res.writeHead(200);
    res.end(JSON.stringify({
      msg: 'success',
      result
    }));
  } else {
    // 对于非 `/pathExists` 或非 GET 请求，返回fail
    res.writeHead(200);
    res.end(JSON.stringify({ msg: 'fail' }));
  }
});

// 服务器监听 8080 端口
server.listen(8080, () => {
  console.log(`Server is running on http://localhost:8080/`);
});

function pathExists(list = []) {
  if (!Array.isArray(list)) {
    return list
  }
  return list.filter(({ url, downloadsLocation, filename }) => {
    const p = path.resolve(downloadsLocation, filename)
    return !fs.existsSync(p)
  })
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
