console.log('Starting Extension');

/**
 * Listen for clicks on the buttons, and send the appropriate message to
 * the content script in the page.
 */
async function initListeners() {

  async function toggleOnOff(event) {
    browser.tabs.query({ active: true, currentWindow: true })
      .then(function (tabs) {
        browser.tabs.sendMessage(tabs[0].id, {
          command: "updateOnOff",
          value: event.target.checked
        })
      })
      .catch((error) => {
        console.log('error', error);
      });
  }

  async function updateDryWet(event) {
    browser.tabs.query({ active: true, currentWindow: true })
      .then(function (tabs) {
        browser.tabs.sendMessage(tabs[0].id, {
          command: "updateDryWet",
          value: event.target.value
        });
      })
      .catch((error) => {
        console.log('error', error);
      });
  }

  const onOff = document.getElementById('onoff');
  const drywet = document.getElementById('drywet');
  onOff.addEventListener('change', toggleOnOff, false);
  drywet.addEventListener('change', updateDryWet, false);
}

function reportExecuteScriptError(error) {
  console.error(`Failed to execute content script: ${error}`);
}

/**
 * When the popup loads, inject a content script into the active tab,
 * and add a click handler.
 * If we couldn't inject the script, handle the error.
 */
browser.tabs.executeScript({ file: "/content_scripts/audioContext.js" })
  .then(initListeners)
  .catch(reportExecuteScriptError);
