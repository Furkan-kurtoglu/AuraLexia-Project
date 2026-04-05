(function (global) {
  const BUFFER_CAP = 500000;
  const MIN_DT_MS = 100;
  const samples = [];
  let lastAcceptedAt = 0;

  function wallClockMs() {
    return Math.round(global.performance.timeOrigin + global.performance.now());
  }

  global.AuraLexiaGaze = {
    reset() {
      samples.length = 0;
      lastAcceptedAt = 0;
    },

    getSamples() {
      return samples.slice();
    },

    pushFromWebGazer(prediction) {
      if (!prediction || prediction.x == null || prediction.y == null) {
        return;
      }
      const t = wallClockMs();
      if (samples.length && t - lastAcceptedAt < MIN_DT_MS) {
        return;
      }
      lastAcceptedAt = t;
      if (samples.length >= BUFFER_CAP) {
        samples.shift();
      }
      samples.push({
        x: prediction.x,
        y: prediction.y,
        t,
      });
    },
  };
})(window);
