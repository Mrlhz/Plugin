
- [examples/api/downloads](https://github.com/GoogleChrome/chrome-extensions-samples/tree/master/mv2-archive/api/downloads/)

### chrome.downloads
> Description: Use the chrome.downloads API to programmatically initiate, monitor, manipulate, and search for downloads.
> 描述：使用chrome.downloadsAPI 以编程方式启动、监视、操作和搜索下载。



#### DownloadOptions([options])
- `options` <[Object]>  可选项。有以下字段：
  - `body` <[string]>
  - `conflictAction` <[string]> uniquify | overwrite | prompt
  - `filename` <[string]>
  - `headers` <[HeaderNameValuePair]> https://developer.chrome.com/docs/extensions/reference/downloads/#type-HeaderNameValuePair
  - `method` <[HttpMethod]> https://developer.chrome.com/docs/extensions/reference/downloads/#type-HttpMethod
  - `saveAs` <[boolean]>
  - `url` <[string]>


