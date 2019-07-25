/*

TDM is a format for visualizing annotations on video.
It is a lossy format, and should not be used to store or
save information about an annotation. TDM is designed to
be simple enough that any annotation generation method
should produce sufficient data to transcribe to TDM.

TDM stands for Tracks, Detections, and Metadata.

Some metadata properties are considered first-class, such
as "color" and "label".  They can directly affect how the track
is rendered.  Other metadata properties can be tertiary, and
exist for the purpose of easily finding and manipulating other
properties.

For example, "actor_id" has no meaning in TDM, but a client
application may want to set "state" = "hidden" for all "actor_id"
matching a certain value.

*/

import { findRange } from './listutils';

/**
 * @typedef {string} TrackState
 */

/**
 * Enum for track state
 * @readonly
 * @enum {TrackState}
 */
export const STATES = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
  HIDDEN: 'hidden',
};

/**
 * Whole integer frame number
 * @typedef {number} Frame
 */

/**
 * Detection Schema; a detection describes a single frame within a track
 * @typedef {Object} Detection
 * @property {Frame} frame
 * @property {Array<Number>} box [x_left, y_top, x_right, y_bottom]
 *                               null box means this detection applies to entire frame
 * @property {String} image a url for an image to overlay within box
 * @property {Metadata} meta metadata for this single detection
 */


/**
 * Track Schema; a track is an annotated range within a single video
 * @typedef {Object} Track
 * @property {String} key a unique key to identify the track
 * @property {Metadata} meta
 * @property {Array<Detection>} detections
 * @property {Frame} begin
 * @property {Frame} end
 * @property {Boolean} interpolated whether the detections need interpolation
 */

/**
 * Event Schema; an event is a range within a track
 * @typedef {Object} Event
 * @property {Track} track reference to the parent track
 * @property {Frame} begin integer frame #
 * @property {Frame} end integer frame #
 */

/* Private functions */

/**
 * @param {Track} track
 * @param {Number} threshold
 * @param {String} thresholdKey
 * @returns {Array<Event>}
 */
function _findThresholdCrossings(track, threshold, thresholdKey) {
  const crossings = [];
  let pair = null;
  let looking = false; // true = looking for close.  false = looking for open.
  track.detections.forEach((d, i) => {
    const val = d.meta[thresholdKey];
    if ((val > threshold || !threshold) && !looking) {
      looking = true;
      pair = [d.frame];
    } else if (
      ((val < threshold) || (i === (track.detections.length - 1))) && looking) {
      looking = false;
      pair.push(d.frame);
      crossings.push({
        meta: track.meta,
        track,
        begin: pair[0],
        end: pair[1],
      });
    }
  });
  return crossings;
}

/* public functions */

/**
 * Returns the linear interpolation between d0 and d1 at currentFrame
 * @param {Number} currentFrame
 * @param {Detection} d0
 * @param {Detection} d1
 * @returns {Detection}
 */
function interpolateFrames(currentFrame, d0, d1) {
  const len = d1.frame - d0.frame;
  // a + b = 1; interpolate from a to b
  const b = Math.abs((currentFrame - d0.frame) / len);
  const a = 1 - b;
  let interpolated = true;
  if (b === 0 || a === 0) {
    interpolated = false; // actually this is a keyframe
  }
  let box;
  if (d0.box) {
    box = d0.box.map((_, i) => ((d0.box[i] * a) + (d1.box[i] * b)));
  }
  const meta = { ...d0.meta, interpolated };
  const frame = Math.round((d0.frame * a) + (d1.frame * b));
  return {
    ...d0,
    meta,
    frame,
    box,
  };
}

/**
 * Get range of detections with final detection interpolated
 * @param {Array<Detection>} detections
 * @param {Frame} start
 * @param {Frame} end
 */
function getInterpolatedRange(detections, start, end) {
  const range = findRange(detections, start, end, 'frame');
  if (range.length >= 2) {
    const endFrame = interpolateFrames(end, range[range.length - 2], range[range.length - 1]);
    range[range.length - 1] = endFrame;
    return range;
  } else if (range.length === 1) {
    return range;
  }
  return [];
}

/**
 * @param {Array<Number>} box
 * @param {Number} scale (0, 1]
 * @returns {Array<Number>}
 */
function scaleBox(box, scale) {
  return box.map(n => Math.round(n * scale));
}

/**
 * Filter some item with meta-properties by key/val.
 * @param {Array<Track>|Array<Detection>} items
 * @param {String} key
 * @param {Array} values
 * @returns {Array<Track>|Array<Detection>}
 */
function filterByMeta(items, key, values) {
  return items.filter(v => values.indexOf(v.meta[key]) >= 0);
}

/**
 * Given a rectangle and two unit vectors,
 * get the point in the rectangle at (x, y)
 * @param {Array<Number>} box
 */
function centroid(box, x = 0.5, y = 0.5) {
  return [
    Math.round((box[2] * x) + (box[0] * (1 - x))),
    Math.round((box[3] * y) + (box[1] * (1 - y))),
  ];
}

/**
 * Return a list of events for tracks with detections > threshold
 * @param {Object<string, Array<Track>>} groups the groups to threshold
 * @param {Number} threshold scalar comparator
 * @param {String} thresholdKey detection metadata key to use as thresh value
 * @returns {Array<Array<Event>>}
 */
function eventsForThreshold(groups, threshold, thresholdKey) {
  const groupKeys = Object.keys(groups);
  const eventsMap = {};
  groupKeys.forEach((groupByKey) => {
    const tracks = groups[groupByKey];
    const eventslist = tracks
      .map(t => _findThresholdCrossings(t, threshold, thresholdKey))
      .filter(events => events.length > 0);
    eventsMap[groupByKey] = eventslist;
  });
  return eventsMap;
}

/**
 * Merge thinglists from b into a
 */
function mergeFrameArrays(a, b) {
  b.forEach((thinglist, frame) => {
    if (a[frame]) {
      a[frame].push(...thinglist);
    } else {
      // eslint-disable-next-line no-param-reassign
      a[frame] = thinglist;
    }
  });
  return a;
}

function sortDetections(a, b) {
  return a.frame - b.frame;
}

export {
  centroid,
  eventsForThreshold,
  filterByMeta,
  interpolateFrames,
  getInterpolatedRange,
  mergeFrameArrays,
  scaleBox,
  sortDetections,
};
