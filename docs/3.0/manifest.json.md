
### 清单文件格式

- [Manifest file format](https://developer.chrome.com/docs/extensions/mv3/manifest/)
- [注入脚本](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)

```json
{
  // Required
  "manifest_version": 3,
  "name": "My Extension",
  "version": "versionString",

  // Recommended
  "action": {...},
  "default_locale": "en",
  "description": "A plain text description",
  "icons": {...},

  // Optional
  "author": ...,
  "automation": ...,
  "background": {
    // Required
    "service_worker": "background.js", // 用于的脚本"service_worker"必须位于扩展程序的根目录中。
    // Optional
    "type": "module" // 可选，"type": "module"以将 service worker 作为 ES 模块包含在内，这允许您import进一步编码。
  },
  "chrome_settings_overrides": {...},
  "chrome_url_overrides": {...},
  "commands": {...},
  "content_capabilities": ...,
  "content_scripts": [{...}], // https://developer.chrome.com/docs/extensions/mv3/content_scripts/
  "content_security_policy": {...},
  "converted_from_user_script": ...,
  "cross_origin_embedder_policy": {"value": "require-corp"},
  "cross_origin_opener_policy": {"value": "same-origin"},
  "current_locale": ...,
  "declarative_net_request": ...,
  "devtools_page": "devtools.html",
  "differential_fingerprint": ...,
  "event_rules": [{...}],
  "externally_connectable": {
    "matches": ["*://*.example.com/*"]
  },
  "file_browser_handlers": [...],
  "file_system_provider_capabilities": {
    "configurable": true,
    "multiple_mounts": true,
    "source": "network"
  },
  "homepage_url": "https://path/to/homepage",
  "host_permissions": [...],
  "import": [{"id": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}],
  "incognito": "spanning, split, or not_allowed",
  "input_components": ...,
  "key": "publicKey",
  "minimum_chrome_version": "versionString",
  "nacl_modules": [...],
  "natively_connectable": ...,
  "oauth2": ...,
  "offline_enabled": true,
  "omnibox": {
    "keyword": "aString"
  },
  "optional_permissions": ["tabs"],
  "options_page": "options.html",
  "options_ui": {
    "chrome_style": true,
    "page": "options.html"
  },
  "permissions": ["tabs"],
  "platforms": ...,
  "replacement_web_app": ...,
  "requirements": {...},
  "sandbox": [...],
  "short_name": "Short Name",
  "storage": {
    "managed_schema": "schema.json"
  },
  "system_indicator": ...,
  "tts_engine": {...},
  "update_url": "https://path/to/updateInfo.xml",
  "version_name": "aString",
  "web_accessible_resources": [{
    {
      "resources": [ "test1.png", "test2.png" ],
      "matches": [ "https://web-accessible-resources-1.glitch.me/*" ]
    }, {
      "resources": [ "test3.png", "test4.png" ],
      "matches": [ "https://web-accessible-resources-2.glitch.me/*" ],
      "use_dynamic_url": true
    }, {
      "resources": ["js/*", "js/*.js", "*"],
      "matches": ["<all_urls>"]
    }
  }]
}
```

- [Manifest - Web Accessible Resources](https://developer.chrome.com/docs/extensions/mv3/manifest/web_accessible_resources/)
### web_accessible_resources.resources
> An array of resources to be exposed. Resources are specified as strings and may contain * for wildcard matches. For example, "/images/*" exposes everything in the extension's /images directory recursively while "*.png" exposes all PNG files.

### web_accessible_resources.matches
> A list of URL match patterns specifying which pages can access the resources. Only the origin is used to match URLs. Origins include subdomain matching. Paths are ignored.

### web_accessible_resources.extension_ids

> A list of extension IDs, specifying which extensions can access the resources.
### web_accessible_resources.use_dynamic_url
> If true, only allow resources to be accessible through dynamic ID. The dynamic ID is generated per session. It's regenerated on browser restart or extension reload.
