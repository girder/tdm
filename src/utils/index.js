import * as tdm from './tdm';

/**
 * @param {Function} func
 * @param {Number} wait milliseconds
 * @param {Boolean} immediate
 * @param {Number} count if set, increment on
 */
const debounce = (func, wait, immediate = false, count = NaN) => {
  let timeout;
  let counter = count;

  return () => {
    const context = this;
    const args = arguments;

    const callNow = immediate || counter === 0;

    const later = () => {
      timeout = null;
      counter = count;
      if (!callNow) func.apply(context, args);
    };

    clearTimeout(timeout);

    if (callNow) {
      counter = count;
      func.apply(context, args);
    } else {
      if (!Number.isNaN(counter)) counter -= 1;
      timeout = setTimeout(later, wait);
    }
  };
};

// clamping
function valBetween(v, min, max) {
  return (Math.min(max, Math.max(min, v)));
}

/**
 * Get the URL parameters
 * source: https://css-tricks.com/snippets/javascript/get-url-variables/
 * @param  {String} url The URL
 * @returns {Object}    The URL parameters
 */
function getParams(url) {
  const params = {};
  const parser = document.createElement('a');
  parser.href = url;
  const query = parser.search.substring(1);
  const vars = query.split('&');
  for (let i = 0; i < vars.length; i += 1) {
    const pair = vars[i].split('=');
    params[pair[0]] = decodeURIComponent(pair[1]);
  }
  return params;
}

/**
 * Function to backfill a track with detections at each frame and a constant confidence value
 * @param {Array<import('./tdm').Detection>} detections
 * @param {Number} begin
 * @param {Number} end
 * @param {Number} confidence
 * @returns {Array<import('./tdm').Detection>}
 */
function fillMissingDetections(detections, begin, end, confidence = 0.01) {
  let next = 0;
  const output = [];
  for (let frame = begin; frame <= end; frame += 1) {
    if (frame === detections[next].frame) {
      output.push(detections[next]);
      next = next < (detections.length - 1) ? next + 1 : next;
    } else {
      output.push({
        frame,
        meta: { confidence },
        track: detections[next].track,
      });
    }
  }
  return output;
}

/**
 * Convert x and y from system1 to system2
 * @param {Number} x
 * @param {Number} y
 * @param {Arary<Number>} system1
 * @param {Array<Number>} system2
 */
function convert2d(x, y, system1, system2) {
  const [s1width, s1height] = system1;
  const [s2width, s2height] = system2;
  return [
    (x / s1width) * s2width,
    (y / s1height) * s2height,
  ];
}

// https://bugs.webkit.org/show_bug.cgi?id=21868#c21
// https://www.kirupa.com/html5/getting_mouse_click_position.htm
function getPosition(event) {
  const e = event || window.event;
  const target = e.target || e.srcElement;
  const rect = target.getBoundingClientRect();
  const offsetX = e.clientX - rect.left;
  const offsetY = e.clientY - rect.top;

  return { offsetX, offsetY };
}

/**
 * @param {File} inputFile
 * @returns {Promise} stringPromise
 */
function readUploadedFileAsText(inputFile, fallback) {
  const temporaryFileReader = new FileReader();
  return new Promise((resolve, reject) => {
    temporaryFileReader.onerror = (err) => {
      console.error(err);
      temporaryFileReader.abort();
      reject(new DOMException('Problem parsing input file.'));
    };
    temporaryFileReader.onload = () => {
      resolve(temporaryFileReader.result);
    };
    try {
      temporaryFileReader.readAsText(inputFile);
    } catch (err) {
      if (fallback) {
        resolve(fallback);
      } else {
        throw err;
      }
    }
  });
}

export {
  convert2d,
  debounce,
  getParams,
  getPosition,
  tdm,
  valBetween,
  fillMissingDetections,
  readUploadedFileAsText,
};
