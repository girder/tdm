import { sortDetections } from './tdm';

export const TRACKIDi = 0;
export const FRAMEi = 2;
export const BBOXi0 = 3; // 9, 10, 11, 12
export const BBOXi1 = 4; // 9, 10, 11, 12
export const BBOXi2 = 5; // 9, 10, 11, 12
export const BBOXi3 = 6; // 9, 10, 11, 12
export const TYPEi = 9;

/**
 * KPF Class parses annotations defined in KPF yaml format.
 */
export default class Viame {
  constructor(data = [], meta = {}) {
    this.data = data;
    this.meta = meta;
    this.postProcess();
  }

  postProcess() {
    const trackMap = {};
    this.data.forEach((d) => {
      const trackId = d[TRACKIDi];
      const frame = parseInt(d[FRAMEi], 10);
      const detection = {
        frame,
        // ParseInt becuase greater than pixel resolution is nonsense
        box: d.slice(BBOXi0, BBOXi0 + 4).map(c => parseInt(c, 10)),
        meta: {},
      };
      if (!(trackId in trackMap)) {
        trackMap[trackId] = {
          begin: frame,
          end: 0, // Update this after sort.
          key: trackId,
          meta: {
            type: d[TYPEi],
          },
          detections: [],
        };
      }
      trackMap[trackId].detections.push(detection);
    });
    // Find track end times after full population
    this.tracks_ = Object.values(trackMap)
      .map((track) => {
        const sorted = track.detections.sort(sortDetections);
        const end = sorted[sorted.length - 1].frame;
        return {
          ...track,
          detections: sorted,
          end,
        };
      });
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
   * @param {String} data
   */
  static fromText(dataText, separator = ',') {
    const dataLines = dataText.split('\n');
    const data = dataLines
      .map(line => line.replace('\r', ''))
      .map(line => line.split(separator))
      .filter(line => line[0].indexOf('#') !== 0)
      .filter(line => line.length > 1);
    return new Viame(data);
  }
}
