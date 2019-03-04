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
 * @typedef {number} ShapeType
 */

/**
 * Enum for shape types
 * @readonly
 * @enum {ShapeType}
 */
export const SHAPES = {
  POINT: 1,
  LINE: 2,
};

/**
 * Meta Schema
 * @typedef {Obect} Metadata
 * ... Can have any properties.
 */

/**
 * Shape Schema
 * @typedef {Object} Shape
 * @property {any} data
 * @property {ShapeType} type
 */

/**
 * Detection Schema
 * @typedef {Object} Detection
 * @property {Number} frame
 * @property {Array<Number>} box [x_left, y_top, x_right, y_bottom]
 *                               null box means this detection applies to entire frame.
 * @property {Track} track backreference to track that owns it.
 * @property {Metadata} meta metadata for this single detection.
 */

/**
 * Track Schema
 * @typedef {Object} Track
 * @property {String} key a unique key to identify the track
 * @property {Metadata} meta
 * @property {Array<Detection>} detections
 * @property {Number} begin
 * @property {Number} end
 * @property {Boolean} interpolated whether the detections need interpolation
 * @property {String} color html color string
 * @property {Array<Shapes>} shapes
 * @property {TrackState} state
 */

/**
 * Returns the linear interpolation between d0 and d1 at currentFrame.
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
  const box = d0.box.map((_, i) => ((d0.box[i] * a) + (d1.box[i] * b)));
  const frame = Math.round((d0.frame * a) + (d1.frame * b));
  return { ...d0, frame, box };
}

/**
 * @param {Array<Number>} box
 * @param {Number} scale (0, 1]
 * @returns {Array<Number>}
 */
function scaleBox(box, scale) {
  return box.map(n => (n * scale));
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
    Math.round((box[2] * x) + (box[0] * x)),
    Math.round((box[3] * y) + (box[1] * y)),
  ];
}

/**
 * Generate a list of centroids for a given track.
 * @param {Array<Detection>} detections
 * @returns {Array<Shape>}
 */
function generateCentroids(detections) {
  return detections.map(d => ({
    type: SHAPES.POINT,
    data: {
      point: centroid(d.box),
      radius: 4, // unitless scalar
    },
  }));
}

function findThresholdCrossings(track, threshold, thresholdKey) {
  const crossings = [];
  let pair = null;
  let looking = false; // true = looking for close.  false = looking for open.
  for (let i = 0; i < track.detections.length; i += 1) {
    const d = track.detections[i];
    const val = d.meta[thresholdKey];
    if (val > threshold && !looking) {
      looking = true;
      pair = [d.frame + 0.01];
    } else if (val < threshold && looking) {
      looking = false;
      pair.push(d.frame);
      crossings.push(pair);
    } else if (looking && i === (track.detections.length - 1)) {
      looking = false;
      pair.push(d.frame);
      crossings.push(pair);
    }
  }
  return crossings;
}

function seriesForThreshold(tracks, threshold, thresholdKey) {
  return tracks
    .map(track => findThresholdCrossings(track, threshold, thresholdKey))
    .filter(series => series.length > 0);
}

/**
 * Generate a list of lines between all centroids for a track.
 * @param {Array<Detection>} detections
 * @returns {Array<Shape>}
 */
function generateDetectionLines(detections, x = 0.5, y = 0.5) {
  return detections.slice(0, detections.length - 1).map((_, i) => ({
    type: SHAPES.LINE,
    data: {
      width: 2,
      a: centroid(detections[i].box, x, y),
      b: centroid(detections[i + 1].box, x, y),
    },
  }));
}

export {
  centroid,
  filterByMeta,
  generateCentroids,
  generateDetectionLines,
  interpolateFrames,
  scaleBox,
  seriesForThreshold,
};
