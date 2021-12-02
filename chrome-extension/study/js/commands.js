/**
 * @description chrome.commands
 */

export default function commandInit() {
  chrome.commands.onCommand.addListener((command) => {
    console.log(`Command "${command}" triggered`) // inject-script
  })
}