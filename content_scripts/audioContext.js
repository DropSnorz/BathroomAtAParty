(function main() {

  const getMediaSources = (audioContext) => {
    let videos = Array.from(document.getElementsByTagName('video'));
    let audio = Array.from(document.getElementsByTagName('audio'));
    console.log('videos ', videos);
    console.log('audio ', audio);

    let all = videos.concat(audio);

    let allMediaSources = all.map((mediaElement) => {
      mediaElement.crossOrigin = "anonymous";
      return audioContext.createMediaElementSource(mediaElement);
    });
    console.log(allMediaSources)
    return allMediaSources;
  }

  const createMediaAudioChain = (media, audioContext) => {
    return {
      media: media,
      lowPassFilter: createFilter(audioContext),
      reverb: createReverb(audioContext),
      reverbDrySignal: audioContext.createGain(),
      reverbWetSignal: audioContext.createGain()
    }
  }

  const activateMediaAudioChain = (mediaAudioChain, audioContext) => {
    mediaAudioChain.media.disconnect();
    mediaAudioChain.media.connect(mediaAudioChain.lowPassFilter);
    mediaAudioChain.lowPassFilter.connect(mediaAudioChain.reverbDrySignal);
    mediaAudioChain.lowPassFilter.connect(mediaAudioChain.reverb);
    mediaAudioChain.reverb.connect(mediaAudioChain.reverbWetSignal);
    mediaAudioChain.reverbDrySignal.connect(audioContext.destination);
    mediaAudioChain.reverbWetSignal.connect(audioContext.destination);

  }

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

  if (window.hasRun) {
    return;
  }
  window.hasRun = true;

  let audioContext = undefined;
  let mediaAudioChains = [];

  /**
   * Activates or create audio processing chains an all current page medias
   */
  function activate() {
    // Retireve or preload audio context
    if (!audioContext) {
      console.log('Defining AudioContext');
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      // Extend audioContext with reverbjs
      reverbjs.extend(audioContext);
    } else {
      console.log('Retrieving already defined AudioContext');
    }

    let mediaSources = getMediaSources(audioContext);
    // Creates an audio processing chain for each new media element.
    mediaSources.forEach((mediaSource) => {
      if (mediaAudioChains.filter(c => c.media.mediaElement == mediaSource.mediaElement).length == 0) {
        mediaAudioChains.push(createMediaAudioChain(mediaSource, audioContext));
      }
    });

    // Activates all audio processing chains
    for (mediaAudioChain of mediaAudioChains) {
      activateMediaAudioChain(mediaAudioChain, audioContext);
    }

  }

  /**
   * Deactivates all audio processing chains
   */
  function deactivate() {
    for (mediaAudioChain of mediaAudioChains) {
      deactivateMediaAudioChain(mediaAudioChain, audioContext);
    }
  }

  /**
   * Update low pass filters parameters in each processing chains 
   * based on a raw input value.
   * @param {*} input 
   */
  function updateLowPassFilter(input) {
    // Reverse input scale. Cut lowest frequency on high values.
    let frequency = -input + 100;
    frequency = logScaleRange(frequency, 200, 20000)

    console.log('lowpass freq: ', frequency);
    for (mediaAudioChain of mediaAudioChains) {
      console.log(mediaAudioChain);
      mediaAudioChain.lowPassFilter.type = "lowpass";
      mediaAudioChain.lowPassFilter.frequency.value = frequency;
      mediaAudioChain.lowPassFilter.Q.value = 1;
    }
  }

  /**
   * Update reverb wet signal amount based on a raw input value.
   * @param {*} input 
   */
  function updateReverbAmount(input) {
    for(mediaAudioChain of mediaAudioChains) {
      mediaAudioChain.reverbWetSignal.gain.value = input / 100
    }
  }

  function logScaleRange(value, minOutput, maxOutput) {
    let minInput = 0;
    let maxInput = 100;
    minOutputLog = Math.log(minOutput);
    maxOutputLog = Math.log(maxOutput);
    let scale = (maxOutputLog - minOutputLog) / (maxInput - minInput);
    return Math.round(Math.exp(minOutputLog + scale * (value - minInput)));
  }

  function logScale(value) {
    let minOutput = 2;
    let maxOutput = 20000;
    return logScaleRange(value, minOutput, maxOutput)
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
})();
