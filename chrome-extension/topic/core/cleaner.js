/**
 * 🧹 工业级文件名/路径强力清洗器
 * @param {string} str - 待清洗的原始文本
 * @param {string} [dotReplaceWith=''] - 末尾点号替换符，默认直接剔除
 * @param {string} [invalidReplaceWith='_'] - 系统违禁符替换符
 * @returns {string} 清洗后的安全文本（最大255字符）
 */
export function cleanString(str, dotReplaceWith = '', invalidReplaceWith = '_') {
  if (!str) return '';
  return str
    .replace(/[\r\n\t]/g, ' ')
    .replace(/[\\/:*?"<>|]/g, invalidReplaceWith)
    .replace(/^\s+|\s+$/g, '')
    .replace(/\.+$/g, dotReplaceWith)
    .replace(/^\s+|\s+$/g, '')
    .substring(0, 255);
}

/**
 * 💡 工具方法：安全且纯净地提取 url 中的文件名
 * @param {string} urlStr - 原始 url 字符串
 * @param {string} defaultName - 兜底文件名
 * @returns {string} 提取出的文件名
 */
export function extractFileName(urlStr, defaultName = 'download') {
  if (typeof urlStr !== 'string') return defaultName;

  // 1. 快速去除空白，规范化
  const trimmed = urlStr.trim();
  if (!trimmed) return defaultName;

  try {
    // 2. 修复对 '//example.com' 或无协议域名的解析漏洞
    const hasProtocol = /^[a-z0-9]+:/i.test(trimmed) || trimmed.startsWith('//');
    const urlObj = new URL(hasProtocol ? trimmed : `https://${trimmed}`);

    // 3. 提取路径名并解码中文/特殊字符
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop();

    if (!filename) return defaultName;

    return decodeURIComponent(filename);
  } catch {
    // 4. 降级方案：纯文本切分
    const pathPart = trimmed.split(/[?#]/)[0]; // 同时去掉 ? 和 #
    const filename = pathPart.split('/').pop();

    if (!filename) return defaultName;

    try {
      return decodeURIComponent(filename);
    } catch {
      return filename; // 解码失败直接返回原片段
    }
  }
}