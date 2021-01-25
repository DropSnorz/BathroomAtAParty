
import browser from 'webextension-polyfill'
import '../styles/popup.scss'

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

      if (!tabsState) {
        tabsState = {};
      }
      if (!(tabId in tabsState)) {
        tabsState[tabId] = { onoff: false, drywet: 0 };
        browser.storage.local.set({ tabsState: tabsState });
      }
      document.getElementById('onoff').checked = tabsState[tabId].onoff;
      document.getElementById('drywet').value = tabsState[tabId].drywet;
      updateOnOffDisplay(tabsState[tabId].onoff);

    })
    .catch((error) => {
      console.log('error', error);
    });

}


async function initListeners() {

  async function toggleOnOff(event) {
    browser.tabs.query({ active: true, currentWindow: true })
      .then(function (tabs) {
        let tabId = tabs[0].id;
        browser.storage.local.get('tabsState').then(function (state) {
          if (tabId in state.tabsState) {
            state.tabsState[tabId].onoff = event.target.checked;
            browser.storage.local.set({ tabsState: state.tabsState });
          }
        });

        if (event.target.checked) {
          browser.browserAction.setIcon({ path: "assets/icons/icon_active.svg", tabId: tabId });
        } else {
          browser.browserAction.setIcon({ path: "assets/icons/icon.svg", tabId: tabId });
        }

        updateOnOffDisplay(event.target.checked);

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
            browser.storage.local.set({ tabsState: state.tabsState });
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

  const onOff = document.querySelector('#onoff');
  const drywet = document.querySelector('#drywet');
  onOff.addEventListener('change', toggleOnOff, false);
  drywet.addEventListener('change', updateDryWet, false);
}

function updateOnOffDisplay(isActivate) {
  const title = document.querySelector("#title");
  const toggleButton = document.querySelector("#toggleButton");
  if (isActivate) {
    title.classList.add("on");
    toggleButton.classList.add("on");
  } else {
    title.classList.remove("on");
    toggleButton.classList.remove("on");
  }
}

/**
 * When the popup loads, inject a content script into the active tab,
 * init tab state and add event listeners. 
 */

document.addEventListener('DOMContentLoaded', async () => {
  initPopup();
  initListeners();
})

