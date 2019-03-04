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

function valBetween(v, min, max) {
  return (Math.min(max, Math.max(min, v)));
}

/**
 * Get the URL parameters
 * source: https://css-tricks.com/snippets/javascript/get-url-variables/
 * @param  {String} url The URL
 * @return {Object}     The URL parameters
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

export {
  debounce,
  getParams,
  tdm,
  valBetween,
};
