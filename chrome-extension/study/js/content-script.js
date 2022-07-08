console.log('content-script.js work!');

/**
 * @link https://stackoverflow.com/questions/9515704/use-a-content-script-to-access-the-page-context-variables-and-functions
 */
function injectScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject-script.js');
  script.onload = function () {
    console.log('load', this)
  };
  (document.head || document.documentElement).appendChild(script);
}


injectScript()
