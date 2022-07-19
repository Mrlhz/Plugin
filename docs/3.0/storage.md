

- [Properties](https://developer.chrome.com/docs/extensions/reference/storage/#property-sync)
- [StorageArea](https://developer.chrome.com/docs/extensions/reference/storage/#type-StorageArea)

```
get:     Gets one or more items from storage.
set:     Sets multiple items.
clear:   Removes all items from storage.
remove:  Removes one or more items from storage.
```

### `chrome.storage.sync.get`

> Gets one or more items from storage.
```js
chrome.storage.sync.get
(keys?: string | string[] | object, callback?: function) => {...}
```

```js
// Usage
await chrome.storage.sync.get(['key'])

chrome.storage.sync.get(['key'], function(result) {
  console.log(result)
})
```

### `chrome.storage.sync.set`

> Gets one or more items from storage.
```js
chrome.storage.sync.set
(items: object, callback?: function) => {...}
```

```js
// Usage
const result = { key: {} }
await chrome.storage.sync.set(result)

chrome.storage.sync.set(result, function(result) {
  console.log(result)
})
```


### `chrome.storage.sync.remove`

> Removes one or more items from storage.

```js
(keys: string | string[], callback?: function) => {...}
```

```js
// Usage
await chrome.storage.sync.remove(['key', 'key2'])

```

### `chrome.storage.sync.clear`

> Removes all items from storage.

```js
(callback?: function) => void
```

```js
await chrome.storage.sync.clear()
```

## Examples

### Synchronous response to storage updates

```js
// background.js:

chrome.storage.onChanged.addListener(function (changes, namespace) {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(
      `Storage key "${key}" in namespace "${namespace}" changed.`,
      `Old value was "${oldValue}", new value is "${newValue}".`
    );
  }
});
```
### Asynchronous preload from storage

```js
// background.js:

// Where we will expose all the data we retrieve from storage.sync.
const storageCache = {};
// Asynchronously retrieve data from storage.sync, then cache it.
const initStorageCache = getAllStorageSyncData().then(items => {
  // Copy the data retrieved from storage into storageCache.
  Object.assign(storageCache, items);
});

chrome.action.onClicked.addListener(async (tab) => {
  try {
    await initStorageCache;
  } catch (e) {
    // Handle error that occurred during storage initialization.
  }
  // Normal action handler logic.
});

// Reads all data out of storage.sync and exposes it via a promise.
//
// Note: Once the Storage API gains promise support, this function
// can be greatly simplified.
function getAllStorageSyncData() {
  // Immediately return a promise and start asynchronous work
  return new Promise((resolve, reject) => {
    // Asynchronously fetch all data from storage.sync.
    chrome.storage.sync.get(null, (items) => {
      // Pass any observed errors down the promise chain.
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      // Pass the data retrieved from storage down the promise chain.
      resolve(items);
    });
  });
}
```
