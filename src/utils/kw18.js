/**
 * DIVA KPF parser
 *
 * This parser is an example for how to turn a domain-specific annotation schema
 * like DIVA KPF into TDM.  you will likely need to implement a similar converter
 * either on the client or server.
 */

export const KW18_EXTENSIONS = ['kw18', 'kw18.types'];

export const TRACK_ID_i = 0;
export const TRACK_LENGTH_i = 1;
export const FRAME_i = 2;
export const BBOX_i0 = 9; // 9, 10, 11, 12
export const BBOX_i1 = 10; // 9, 10, 11, 12
export const BBOX_i2 = 11; // 9, 10, 11, 12
export const BBOX_i3 = 12; // 9, 10, 11, 12
export const CONFIDENCE_i = 18;

export const TYPE_TRACK_i = 0;
export const TYPE_TYPE_i = 1;

export function defaultConfidenceFunc(detection, detections, index) {
  return 1;
}

/**
 * KPF Class parses annotations defined in KPF yaml format.
 */
export default class KW18 {
  constructor(data = [], types = [], meta = {}) {
    this.data = data;
    this.types = types;
    this.meta = meta;
    this.postProcess();
  }

  postProcess() {
    const typeMap = {};
    this.types.forEach((t) => {
      typeMap[t[TYPE_TRACK_i]] = {
        id: t[TYPE_TRACK_i],
        type: t[TYPE_TYPE_i],
      };
    });
    this.types = typeMap;
    const trackMap = {};
    this.data.forEach((d) => {
      const trackId = d[TRACK_ID_i];
      const detection = {
        frame: parseInt(d[FRAME_i], 10),
        box: d.slice(BBOX_i0, BBOX_i0 + 4).map(c => parseInt(c, 10)),
        meta: {},
      };
      if (!(trackId in trackMap)) {
        trackMap[trackId] = {
          begin: parseInt(d[FRAME_i], 10),
          end: parseInt(d[FRAME_i], 10) + parseInt(d[TRACK_LENGTH_i], 10) - 1,
          key: trackId,
          meta: {
            type: this.types[trackId],
          },
          detections: [],
        };
      }
      trackMap[trackId].detections.push(detection);
    });
    this.tracks_ = trackMap;
  }

  /**
   * return a list of the tracks
   * @returns {Array.<track>}
   */
  get tracks() {
    return Object.keys(this.tracks_)
      .map(key => this.tracks_[key]);
  }

  /**
   * Create KPF object from YAML text strings.
   * @param {String} activityText
   * @param {String} geometryText
   */
  static fromText(dataText, typeText) {
    const dataLines = dataText.split('\n');
    const data = dataLines
      .map(line => line.replace('\r', ''))
      .map(line => line.split(' '))
      .filter(line => line[0].indexOf('#') !== 0)
      .filter(line => line.length > 1);
    const typeLines = typeText.split('\n');
    const types = typeLines
      .map(line => line.replace('\r', ''))
      .map(line => line.split(' '))
      .filter(line => line.length > 1);
    return new KW18(data, types);
  }
}
