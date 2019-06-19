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
  POINT: 1, // data: point, radius, width
  LINE: 2, // data: a: [x, y], b: [x, y], width
  BOX: 3, // data: box: Detection.box, width
  REGION: 4, // data: box: Detection.box, opacity
  IMAGE: 5, // data: url, x, y
  LABEL: 6, // data: text, bgcolor, textcolor
};

/**
 * Meta Schema; can have any properties.
 * @typedef {Obect} Metadata
 */

/**
 * Shape Schema; shapes describe a drawable annotation
 * @typedef {Object} Shape
 * @property {Object} data
 * @property {ShapeType} type
 * @property {String} color
 * @property {Object} meta
 */

/**
 * Event Schema; an event is a range within a track
 * @typedef {Object} Event
 * @param {Track} track reference to the parent track
 * @param {Number} begin integer frame #
 * @param {Number} end integer frame #
 */

/**
 * Detection Schema; a detection describes a single frame within a track
 * @typedef {Object} Detection
 * @property {Number} frame
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
 * @property {Number} begin
 * @property {Number} end
 * @property {Boolean} interpolated whether the detections need interpolation
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
  return { ...d0, meta, frame, box };
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
    Math.round((box[2] * x) + (box[0] * x)),
    Math.round((box[3] * y) + (box[1] * y)),
  ];
}

/**
 * Generate a list of centroids for a given track.
 * @param {Array<Detection>} detections
 * @returns {Array<Shape>}
 */
function generateCentroids(detections, color, radius = 6) {
  return detections.map(d => ({
    type: SHAPES.POINT,
    color,
    data: {
      width: 1,
      point: centroid(d.box),
      radius, // unitless scalar
    },
  }));
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
 * Determine if x, y are inside shape
 */
function intersect({ x, y }, shape) {
  switch (shape.type) {
    case SHAPES.POINT: {
      const { point, radius } = shape.data;
      if (point[0] - radius < x
        && (x < point[0] + radius)
        && point[1] - radius < y
        && y < point[1] + radius) {
        return true;
      }
      break;
    }
    default: {
      return false;
    }
  }
  return false;
}

/**
 * @param {Array<Detection>} detections
 * @param {Function<Detection>:String} colorfunc
 * @returns {Array<Array<Shape>>} where outer array is keyed by frame #
 */
function generateDetectionLines(detections, colorfunc, width = 2, x = 0.5, y = 0.5) {
  const lines = [];
  let last = null;
  detections.forEach((detection, frame) => {
    if (last) {
      lines[last.frame] = [{
        type: SHAPES.LINE,
        color: colorfunc(last),
        data: {
          width,
          a: centroid(last.box, x, y),
          b: centroid(detection.box, x, y),
        },
      }];
    }
    last = detection;
  });
  return lines;
}

/**
 * Merge thinglists from b into a
 */
function mergeFrameArrays(a, b) {
  b.forEach((thinglist, frame) => {
    if (a[frame]) {
      a[frame].push(...thinglist);
    } else {
      a[frame] = thinglist;
    }
  });
  return a;
}

export {
  centroid,
  eventsForThreshold,
  filterByMeta,
  generateCentroids,
  generateDetectionLines,
  interpolateFrames,
  intersect,
  mergeFrameArrays,
  scaleBox,
};
