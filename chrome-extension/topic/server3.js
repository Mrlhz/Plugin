/**
 * server.js - 基于策略模式的重构版
 * 特点：路由可插拔、中间件管道、极致精简
 */

const http = require('http');
const { parse: parseUrl } = require('url');
const path = require('path');
const fs = require('fs');

// ================= 配置与常量 =================
const PORT = 8080;
const MAX_BODY_SIZE = 5 * 1024 * 1024;
const ALLOWED_FS_METHODS = new Set(['access', 'stat', 'lstat', 'readFile', 'readdir']);

// ================= 业务逻辑层 (Handlers) =================
const handlers = {
  // 路由：POST /pathExists
  '/pathExists': async (data) => {
    console.log('Received /pathExists request with data:', data);
    if (!Array.isArray(data)) return [];
    const results = await Promise.all(data.map(async (item) => {
      const { filename, downloadsLocation, exts } = item;
      if (!filename) return { exists: false };
      
      const { dir, name, ext } = path.parse(filename);
      const targets = Array.isArray(downloadsLocation) ? downloadsLocation : [downloadsLocation];
      const extensions = new Set([ext, ...(exts || [])].filter(Boolean));
      
      const checks = [];
      for (const loc of targets) {
        for (const e of extensions) {
          const p = path.resolve(loc, dir, name + e);
          checks.push(fs.promises.access(p, fs.constants.F_OK).then(() => true).catch(() => false));
        }
      }
      const exists = (await Promise.all(checks)).some(Boolean);
      return { item, exists };
    }));


    console.log('Path existence check results:', results);
    
    // 返回所有“不存在”的项
    return results.filter(r => !r.exists).map(r => r.item);
  },

  // 路由：POST /fsPromises/:method (动态匹配)
  '/fsPromises/*': async (data, method) => {
    if (!ALLOWED_FS_METHODS.has(method)) throw new Error(`Method '${method}' forbidden`);
    const fn = fs.promises[method];
    if (typeof fn !== 'function') throw new Error(`Method '${method}' not found`);
    const args = Array.isArray(data) ? data : [data];
    return await fn(...args);
  }
};

// ================= 基础设施层 (Infrastructure) =================

// 1. 中间件：解析 Body
const parseBody = (req) => new Promise((resolve, reject) => {
  const chunks = [];
  let size = 0;
  req.on('data', c => { size += c.length; if (size > MAX_BODY_SIZE) return req.destroy(); chunks.push(c); });
  req.on('end', () => resolve(JSON.parse(Buffer.concat(chunks).toString())));
  req.on('error', reject);
});

// 2. 路由匹配器 (支持动态参数如 :method)
const matchRoute = (pathname) => {
  // 精确匹配
  if (handlers[pathname]) return { handler: handlers[pathname], params: {} };
  
  // 动态匹配 (简单实现通配符 *)
  for (const route of Object.keys(handlers)) {
    if (route.endsWith('/*')) {
      const prefix = route.slice(0, -2);
      if (pathname.startsWith(prefix)) {
        const param = pathname.slice(prefix.length + 1); // 获取 * 部分
        if (param) return { handler: handlers[route], params: { method: param } };
      }
    }
  }
  return null;
};

// ================= HTTP 服务启动 =================
const server = http.createServer(async (req, res) => {
  // 统一响应头 (CORS & JSON)
  const send = (status, body) => {
    res.writeHead(status, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(body));
  };

  // 预检请求
  if (req.method === 'OPTIONS') return send(204, null);
  if (req.method !== 'POST') return send(405, { error: 'Method Not Allowed' });

  try {
    const { pathname } = parseUrl(req.url, true);
    const route = matchRoute(pathname);
    
    if (!route) return send(404, { error: 'Not Found' });

    const body = await parseBody(req);
    const result = await route.handler(body, route.params.method);
    
    send(200, { msg: 'success', result });

  } catch (err) {
    console.error('[Server Error]', err.message);
    const status = err.message.includes('forbidden') ? 403 : 
                   err.message.includes('Large') ? 413 : 
                   err.message.includes('JSON') ? 400 : 500;
    send(status, { msg: 'error', error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`   Routes: ${Object.keys(handlers).join(', ')}`);
});
