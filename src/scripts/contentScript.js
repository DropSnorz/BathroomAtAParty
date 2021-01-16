import browser from 'webextension-polyfill'
import reverbjs from "./lib/Reverbjs/reverb.js"
import DomesticLivingRoom from "./lib/Reverbjs/impulse/DomesticLivingRoom.wav.base64.js"

var audioContext = undefined;
var mediaAudioChains = [];

// Audio elements and sources are cached to workaround an issue
// with chrome WebAudio API implementation:
// Issue 429204: Calling createMediaElementSource() twice with the same HTMLMediaElement throws InvalidStateError 
var mediaSourcesCache = [];

/**
 * Returns media sources in the document.
 * Media sources are created from video and audio element in DOM.
 * @param {*} audioContext 
 */
const getMediaSources = (audioContext) => {
  let videos = Array.from(document.getElementsByTagName('video'));
  let audio = Array.from(document.getElementsByTagName('audio'));
  let all = videos.concat(audio);

  let allMediaSources = all.map((mediaElement) => {
    mediaElement.crossOrigin = "anonymous";
    return getOrCreateMediaElementFromSource(mediaElement, audioContext);
  });
  return allMediaSources;
}

/**
 * Returns an audioSource from a DOM mediaElement. The audioSource is retrieved from cache 
 * if it has previsoulsy been created. If an audioSource has never been initialized for the 
 * given element, it's created on the given audioContext and added to the cache.
 * @param {*} mediaElement 
 * @param {*} audioContext 
 */
const getOrCreateMediaElementFromSource = (mediaElement, audioContext) => {

  // Iterate over cache entries to retrieve audio source for a given element
  for (let [i, cacheEntry] of mediaSourcesCache.entries()) {
    if (cacheEntry.mediaElement.isEqualNode(mediaElement)) {
      return cacheEntry.audioSource;
    }
  }

  // Otherwise, create audio source from DOM element and addit to cache
  let newCacheEntry = {
    mediaElement: mediaElement,
    audioSource: audioContext.createMediaElementSource(mediaElement)
  }
  mediaSourcesCache.push(newCacheEntry);
  return newCacheEntry.audioSource;
}

/**
 * Creates an audio processing chain behind the given media source.
 * @param {*} media 
 * @param {*} audioContext 
 */
const createMediaAudioChain = (media, audioContext) => {
  return {
    media: media,
    lowPassFilter: createFilter(audioContext),
    reverb: createReverb(audioContext),
    reverbDrySignal: audioContext.createGain(),
    reverbWetSignal: audioContext.createGain()
  }
}

/**
 * Activates an audio processing by chaining all nodes input and output from
 * the root media and effects to the audioContext destination.
 * @param {*} mediaAudioChain 
 * @param {*} audioContext 
 */
const activateMediaAudioChain = (mediaAudioChain, audioContext) => {
  mediaAudioChain.media.disconnect();
  mediaAudioChain.media.connect(mediaAudioChain.lowPassFilter);
  mediaAudioChain.lowPassFilter.connect(mediaAudioChain.reverbDrySignal);
  mediaAudioChain.lowPassFilter.connect(mediaAudioChain.reverb);
  mediaAudioChain.reverb.connect(mediaAudioChain.reverbWetSignal);
  mediaAudioChain.reverbDrySignal.connect(audioContext.destination);
  mediaAudioChain.reverbWetSignal.connect(audioContext.destination);

}

/**
 * Deactivates an audio prcessing chain by remove link between audio node and restore
 * a connection between media source and audioContext destination. 
 * @param {*} mediaAudioChain 
 * @param {*} audioContext 
 */
const deactivateMediaAudioChain = (mediaAudioChain, audioContext) => {
  mediaAudioChain.media.disconnect();
  mediaAudioChain.lowPassFilter.disconnect();
  mediaAudioChain.reverb.disconnect();
  mediaAudioChain.reverbDrySignal.disconnect();
  mediaAudioChain.reverbWetSignal.disconnect();
  mediaAudioChain.media.connect(audioContext.destination);
}

const createFilter = (audioContext) => {
  let lowPassFilter = audioContext.createBiquadFilter();
  lowPassFilter.type = "lowpass";
  return lowPassFilter;
}

const createReverb = (audioContext) => {
  let reverb = audioContext.createReverbFromBase64(DomesticLivingRoom);
  return reverb;
}

/**
 * Activates or create audio processing chains in the current page.
 */
function activate() {
  // Retireve or preload audio context
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    // Extend audioContext with reverbjs
    reverbjs.extend(audioContext);
  }

  let mediaSources = getMediaSources(audioContext);

  // Creates an audio processing chain for each new media element.
  mediaSources.forEach((mediaSource) => {
    if (mediaAudioChains.filter(c => c.media.mediaElement == mediaSource.mediaElement).length == 0) {
      mediaAudioChains.push(createMediaAudioChain(mediaSource, audioContext));
    }
  });

  // Activates all audio processing chains
  for (let mediaAudioChain of mediaAudioChains) {
    activateMediaAudioChain(mediaAudioChain, audioContext);
  }

}

/**
 * Deactivates all audio processing chains
 */
function deactivate() {
  for (let mediaAudioChain of mediaAudioChains) {
    deactivateMediaAudioChain(mediaAudioChain, audioContext);
  }
}

/**
 * Updates low pass filters parameters in each processing chains 
 * based on a raw input value.
 * @param {*} input 
 */
function updateLowPassFilter(input) {
  // Reverse input scale. Cut lowest frequency on high values.
  let frequency = -input + 100;
  frequency = logScaleRange(frequency, 200, 20000)

  for (let mediaAudioChain of mediaAudioChains) {
    mediaAudioChain.lowPassFilter.type = "lowpass";
    mediaAudioChain.lowPassFilter.frequency.value = frequency;
    mediaAudioChain.lowPassFilter.Q.value = 1;
  }
}

/**
 * Updates reverb wet signal amount in processing chains based on a raw input value.
 * @param {*} input 
 */
function updateReverbAmount(input) {
  for (let mediaAudioChain of mediaAudioChains) {
    mediaAudioChain.reverbWetSignal.gain.value = input / 100
  }
}

function logScaleRange(value, minOutput, maxOutput) {
  let minInput = 0;
  let maxInput = 100;
  let minOutputLog = Math.log(minOutput);
  let maxOutputLog = Math.log(maxOutput);
  let scale = (maxOutputLog - minOutputLog) / (maxInput - minInput);
  return Math.round(Math.exp(minOutputLog + scale * (value - minInput)));
}

browser.runtime.onMessage.addListener((message) => {
  if (message.command === 'updateOnOff' && message.value == true) {
    activate();
  } else if (message.command === 'updateOnOff' && message.value == false) {
    deactivate();
  } else if (message.command === 'updateDryWet') {
    updateLowPassFilter(message.value);
    updateReverbAmount(message.value);
  }
});

