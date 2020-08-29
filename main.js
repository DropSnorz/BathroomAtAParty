console.log('Starting Extension');

/**
 * Bootsrap extension state and sync UI components display with 
 * local state values.
 */
async function initPopup() {
  browser.tabs.query({ active: true, currentWindow: true })
    .then(async function (tabs) {
      let tabId = tabs[0].id;
      let state = await browser.storage.local.get('tabsState');
      let tabsState = state.tabsState;
      console.log(tabsState)

      if (!tabsState) {
        console.log("init full state");
        tabsState = {};
      }
      console.log(tabsState[tabId]);
      if (!(tabId in tabsState)) {
        console.log("init tab state");
        tabsState[tabId] = {onoff: false, drywet: 0 };
        browser.storage.local.set({tabsState: tabsState});
      }
      document.getElementById('onoff').checked = tabsState[tabId].onoff;
      document.getElementById('drywet').value = tabsState[tabId].drywet;

    })
    .catch((error) => {
      console.log('error', error);
    });

}

/**
 * Listen for clicks on the buttons, and send the appropriate message to
 * the content script in the page.
 */
async function initListeners() {

  async function toggleOnOff(event) {
    browser.tabs.query({ active: true, currentWindow: true })
      .then(function (tabs) {
        let tabId = tabs[0].id;
        browser.storage.local.get('tabsState').then(function (state) {
          if (tabId in state.tabsState) {
            state.tabsState[tabId].onoff = event.target.checked;
            browser.storage.local.set({tabsState: state.tabsState});
          }
        });

        if(event.target.checked) {
          browser.browserAction.setIcon({path: "icons/icon_active.svg", tabId: tabId});
        } else {
          browser.browserAction.setIcon({path: "icons/icon.svg", tabId: tabId});
        }

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
        browser.storage.local.get('tabsState').then(function (state) {
          let tabId = tabs[0].id;
          if (tabId in state.tabsState) {
            state.tabsState[tabId].drywet = event.target.value;
            browser.storage.local.set({tabsState: state.tabsState});
          }
        });

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
  .then(initPopup)
  .then(initListeners)
  .catch(reportExecuteScriptError);
