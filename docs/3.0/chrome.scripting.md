# chrome.scripting

- [API Reference-chrome.scripting](https://developer.chrome.com/docs/extensions/reference/scripting/)

Description | Use the `chrome.scripting` API to execute script in different contexts.
---|---
Permissions | `scripting`
Has warning? | 
Availability | `Chrome 88+` `MV3+`

## Usage

### Injection targets

You can use the target parameter to specify a target to inject JavaScript or CSS into.

The only required field is tabId. By default, an injection will run in the main frame of the specified tab.

```js
const tabId = getTabId();
chrome.scripting.executeScript(
    {
      target: {tabId: tabId},
      files: ['script.js'],
    },
    () => { ... });
```

To run in all frames of the specified tab, you can set the `allFrames` boolean to `true`.
```js
const tabId = getTabId();
chrome.scripting.executeScript(
    {
      target: {tabId: tabId, allFrames: true},
      files: ['script.js'],
    },
    () => { ... });
```

You can also inject into specific frames of a tab by specifying individual frame IDs. For more information on frame IDs, see the [webNavigation API](https://developer.chrome.com/docs/extensions/reference/webNavigation/).

```js
const tabId = getTabId();
const frameIds = [frameId1, frameId2];
chrome.scripting.executeScript(
    {
      target: {tabId: tabId, frameIds: frameIds},
      files: ['script.js'],
    },
    () => { ... });
```

> You cannot specify both the frameIds and allFrames properties.

### Handling results
The results of executing JavaScript are passed to the extension. A single result is included per-frame. The main frame is guaranteed to be the first index in the resulting array; all other frames are in a non-deterministic order.

```js
function getTitle() {
  return document.title;
}
const tabId = getTabId();
chrome.scripting.executeScript(
    {
      target: {tabId: tabId, allFrames: true},
      func: getTitle,
    },
    (injectionResults) => {
      for (const frameResult of injectionResults)
        console.log('Frame Title: ' + frameResult.result);
    });
```

> scripting.insertCSS() does not return any results.

```js
```
```js
```
```js
```
```js
```

## Types

ContentScriptFilter
CSSInjection
ExecutionWorld
InjectionResult
InjectionTarget
RegisteredContentScript
- [ScriptInjection](#ScriptInjection)
StyleOrigin

## Methods

- [executeScript](#executeScript)
getRegisteredContentScripts
insertCSS
registerContentScripts
removeCSS
unregisterContentScripts
updateContentScripts

### ScriptInjection

```ts

interface ScriptInjection {
  args?: any[],
  files?: string[],
  injectImmediately?: boolean,

  // Details specifying the target into which to inject the script.
  target: InjectionTarget,

  // Chrome 95+
  world?: ExecutionWorld,

  // Chrome 92+
  // A JavaScript function to inject. This function will be serialized, and then deserialized for injection. This means that any bound parameters and execution context will be lost. Exactly one of `files` and `func` must be specified.
  func?: function,
}
```

```js

interface InjectionTarget {
  // Whether the script should inject into all frames within the tab. Defaults to false. This must not be true if frameIds is specified.
  allFrames?: boolean,
  // The IDs of specific frames to inject into.
  frameIds?: number[],
  // The ID of the tab into which to inject.
  tabId: number
}

interface ExecutionWorld {
  // The JavaScript world for a script to execute within.
}
```


```ts

interface InjectionResult {
  frameId: number, // The frame associated with the injection.
  result: any // The result of the script execution.
}
```


### executeScript

> Injects a script into a target context. The script will be run at document_idle. If the script evaluates to a promise, the browser will wait for the promise to settle and return the resulting value.

```ts

chrome.scripting.executeScript(
  injection: ScriptInjection,
  callback?: function,
): Promise

```
