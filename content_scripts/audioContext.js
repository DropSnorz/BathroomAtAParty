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

  const createFilter = (source, audioContext) => {
    console.log('createFilter');
    console.log(source);
    lowPassFilter = audioContext.createBiquadFilter();
    source.connect(lowPassFilter);
    lowPassFilter.type = "lowpass";
    lowPassFilter.connect(audioContext.destination);

  }

  const updateLowPassFilter = (input) => {
    // Reverse input scale. Cut lowest frequency on high values.
    let frequency = -input + 100;
    frequency = logScaleRange(frequency, 200, 20000)

    console.log('lowpass freq: ', frequency);
    lowPassFilter.type = "lowpass";
    lowPassFilter.frequency.value = frequency;
    lowPassFilter.Q.value = 1;
  }

  if (window.hasRun) {
    return;
  }
  window.hasRun = true;

  let audioContext = undefined;
  let lowPassFilter = null;
  let mediaSources = undefined;

  function activate(message) {
    console.log('activate', message);
    console.log(mediaSources);

    if (!audioContext) {
      console.log('Defining AudioContext');
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } else {
      console.log('Retrieving already defined AudioContext');
    }

    if (!mediaSources) {
      console.log('Creating mediaSources');
      mediaSources = getMediaSources(audioContext);
    } else {
      console.log('Retrieving already defined media sources');
    }

    mediaSources.forEach((mediaElement) => {
      if (!lowPassFilter) {
        createFilter(mediaElement, audioContext);
      }
      console.log('Reactivating Filter')
    });

  }

  function deactivate() {
    console.log('deactivate');
    if (!lowPassFilter) {
      return
    }
    //TODO: remove lowPassFilter from audio chain.
    lowPassFilter.frequency.value = 20000;
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
    console.log(message)
    if (message.command === 'updateOnOff' && message.value == true) {
      activate(message);
    } else if (message.command === 'updateOnOff' && message.value == false) {
      deactivate();
    } else if (message.command === 'updateDryWet') {
      updateLowPassFilter(message.value);
    }
  });
})();
