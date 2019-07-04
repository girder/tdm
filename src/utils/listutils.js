/*
 * Binary search in JavaScript.
 * https://stackoverflow.com/questions/22697936/binary-search-in-javascript
 * Returns the index of of the element in a sorted array or (-n-1) where n is the
 * insertion point for the new element.
 * Parameters:
 *     ar - A sorted array
 *     el - An element to search for
 *     compare_fn - A comparator function. The function takes two arguments: (a, b) and returns:
 *        a negative number  if a is less than b;
 *        0 if a is equal to b;
 *        a positive number of a is greater than b.
 * The array may contain duplicate elements. If there are more than one equal
 * elements in the array, the returned value can be the index of any one of the equal elements.
 */
export function binarySearch(ar, el, compareFn) {
  let m = 0;
  let n = ar.length - 1;
  while (m <= n) {
    // eslint-disable-next-line no-bitwise
    const k = (n + m) >> 1;
    const cmp = compareFn(el, ar[k]);
    if (cmp > 0) {
      m = k + 1;
    } else if (cmp < 0) {
      n = k - 1;
    } else {
      return k;
    }
  }
  return -m - 1;
}

/**
 * Insert mutates arr.  Not to be used on reactive arrays.
 * @param {Array} arr array
 * @param {*} newval value to add
 * @param {String} key the key the array is sorted by
 */
export function insert(arr, newval, key = 'key') {
  const position = binarySearch(arr, newval, (a, b) => a[key] - b[key]);
  if (position >= 0) {
    // item at newval poisition already exists.
    // eslint-disable-next-line no-param-reassign
    arr[position] = newval;
  } else {
    arr.splice((position * -1) - 1, 0, newval);
  }
}

/**
 * Remove mutates arr;
 * @param {Array} arr array
 * @param {*} val value to remove
 * @param {String} key the key the array is sorted by
 */
export function remove(arr, val, key = 'key') {
  const position = binarySearch(arr, val, (a, b) => a[key] - b[key]);
  if (position > 0) {
    arr.splice(position, 1);
  }
}

/**
 * FindRange returns elements in the array falling within start, end,
 * including the last element before start and the first after end.
 * @param {Array} arr sorted array
 * @param {Number} start start
 * @param {Number} end end
 * @param {String} key the key the array is sorted by
 */
export function findRange(arr, start, end, key = 'key') {
  if (arr.length === 0) {
    return [];
  } else if (start > end) {
    return [];
  }
  let starti = binarySearch(arr, { [key]: start }, (a, b) => a[key] - b[key]);
  // value not in list, binarySearch returned insert position
  if (starti < 0) {
    starti = Math.abs((starti + 1) * -1); // Needed because `-0` is a thing in JS.
  }
  if (starti === 0 && start < arr[0][key]) {
    return []; // start < arr[0]
  } else if (starti === arr.length - 1 && start > arr[arr.length - 1][key]) {
    return [];
  }
  let endi = starti + 1;
  while (arr[endi] && (arr[endi][key] <= end)) {
    endi += 1;
  }
  if (starti > 0 && arr[starti][key] > start) {
    starti -= 1;
  }
  if (arr[endi - 1][key] < end) {
    endi += 1;
  }
  return arr.slice(starti, endi); // Include end AND one after the end
}
