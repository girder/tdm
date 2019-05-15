/**
 * DIVA KPF parser
 *
 * This parser is an example for how to turn a domain-specific annotation schema
 * like DIVA KPF into TDM.  you will likely need to implement a similar converter
 * either on the client or server.
 */

import yaml from 'js-yaml';
import { STATES } from './tdm';

export const COLOR_BY_TYPES = ['instance', 'activity'];

/* eslint-disable */
export const ACTIVITY_COLORS = {
  'Casing_Facility': '#50EBEC',
  'Carry_on_Back': 'red',
  'Enter_Facility': 'orange',
  'Exit_Facility': 'yellow',
  'Hand_Interaction': 'green',
  'Joining_Queue': '#E38AAE',
  'Object_Transfer': 'lime',
  'Open_Facility_Door': 'cyan',
  'People_Talking': 'cyan',
  'Pick_Up_Object': 'lime',
  'Purchasing': 'yellow',
  'Read_Document': 'orange',
  'Set_Down_Object': 'lightblue',
  'Sit_Down': 'magenta',
  'Stand_Up': 'magenta',
  'Text_On_Phone': '#F75D59',
  'Unload_Vehicle': 'magenta',
  'Unknown': 'lime',
  'Vehicle_Moving': 'yellow',
  'default': 'yellow',
  'input': 'red',
  'output': 'white',
}; /* eslint-enable */

export const GEOM_ACTOR_KEY = 'id1';
export const TIMERANGE_KEY = 'tsr0';

/**
 * @param {File} inputFile
 * @returns {Promise} stringPromise
 */
export const readUploadedFileAsText = (inputFile, fallback) => {
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
};

/**
 * KPF Class parses annotations defined in KPF yaml format.
 */
export default class KPF {
  constructor(activities = [], geom = [], types = [], meta = {}) {
    this.activities = activities;
    this.geom = geom;
    this.types = types;
    this.tracksByActor = {};
    this.meta = meta;
    this.postProcess();
  }

  /**
   * postProcess:
   * - convert g0 from string to array, call it bbox
   * - make sure ts0 is present on detections
   * - remove meta
   * - add additional properties:
   *   + activity.actor[i].detections (time-ordered)
   *   + activity.actor[i].type
   *   + activity.name
   */
  postProcess() {
    this.geom = KPF.filterEmpty(this.geom, [GEOM_ACTOR_KEY, 'g0', 'ts0']);
    if (this.activities) {
      this.activities = KPF.filterEmpty(this.activities, ['act2']);
    }
    this.types = KPF.filterEmpty(this.types, [GEOM_ACTOR_KEY]);
    const newTypes = {};
    this.types.forEach((t) => {
      newTypes[t[GEOM_ACTOR_KEY]] = {
        id: t.id,
        type: Object.keys(t.cset3)[0] || 'Unknown',
      };
    });
    this.types = newTypes;
    this.geom = this.geom.map(g => ({
      ...g,
      bbox: g.bbox || g.g0.split(' ').map(f => parseFloat(f)),
      ts0: g.ts0 || g.frame || 0,
      [GEOM_ACTOR_KEY]: g[GEOM_ACTOR_KEY] || 0,
    }));
    this.geom.forEach((g) => {
      const key = g[GEOM_ACTOR_KEY];
      if (key in this.tracksByActor) {
        this.tracksByActor[key].push(g);
      } else {
        this.tracksByActor[key] = [g];
      }
    });
    if (this.activities) {
      this.activities = this.activities.map(a => ({
        ...a,
        actors: a.actors.map(actor => ({
          ...actor,
          timespan: actor.timespan[0][TIMERANGE_KEY],
          detections: KPF.filterRange(
            this.tracksByActor[actor[GEOM_ACTOR_KEY]],
            'ts0',
            actor.timespan[0][TIMERANGE_KEY][0],
            actor.timespan[0][TIMERANGE_KEY][1],
          ),
          type: this.types[actor[GEOM_ACTOR_KEY]]
            ? this.types[actor[GEOM_ACTOR_KEY]].type
            : 'Unknown',
        })),
        name: a.act2 ? Object.keys(a.act2)[0] : a.src, // TODO: this is terrible.
      }));
    } else {
      this.activities = Object.keys(this.tracksByActor).map((track) => {
        return {
          id2: parseInt(track, 10),
          name: track,
          actors: [
            {
              [GEOM_ACTOR_KEY]: track,
              timespan: [
                this.tracksByActor[track][0]['ts0'],
                this.tracksByActor[track][this.tracksByActor[track].length - 1]['ts0'],
              ],
              type: this.types[track].type,
              detections: KPF.filterRange(
                this.tracksByActor[track],
                'ts0',
                this.tracksByActor[track][0]['ts0'],
                this.tracksByActor[track][this.tracksByActor[track].length - 1]['ts0'],
              ),
            },
          ],
        };
      });
    }
  }

  /**
   * return a list of the tracks
   * @returns {Array.<track>}
   */
  get tracks() {
    return [].concat(...this.activities.map(activity =>
      activity.actors.map(actor => ({
        activity,
        actor,
        timespan: actor.timespan,
        detections: actor.detections,
        actorColor: actor.randomColor,
      })))).sort((a, b) => a.detections[0].ts1 - b.detections[0].ts1);
  }

  /**
   * Turn KPF into TDM trackx
   * @param {Object} staticMeta static metadata to assign to all tracks.
   * @returns {Array<tdm.Track>}
   */
  getTDM(staticMeta = {}, basekey = 'track') {
    return this.tracks.map((t, i) => {
      const meta = Object.assign({
        ...this.meta,
        name: t.activity.name,
        activity_id: t.activity.id2,
        type: t.actor.type,
        id: t.activity.id,
        actor_id: t.actor[GEOM_ACTOR_KEY],
        src_status: t.activity.src_status || 'unset',
      }, staticMeta);
      const track = {
        meta,
        key: `${basekey}${i}`,
        interpolated: t.detections.length < (t.timespan[1] - t.timespan[0]),
        color: 'green',
        state: STATES.ACTIVE,
        begin: t.timespan[0],
        end: t.timespan[1],
      };
      const detections = [];
      for (let idx = 0; idx < t.detections.length; idx += 1) {
        const d = t.detections[idx];
        const frame = d.frame || d.ts0;
        detections[idx] = {
          frame,
          meta: {
            src: d.src,
            occlusion: d.occlusion,
            confidence: (idx === 0 || (idx === t.detections.length - 1)) ? 0.001 : 1,
            ...track.meta,
          },
          box: d.bbox,
        };
      }
      track.detections = detections.sort((a, b) => b.frame - a.frame);
      return track;
    });
  }

  /**
   * Return elements of list that have validKey defined
   * @param {Array} list
   * @param {String} validKey
   */
  static filterEmpty(list, validKeyList) {
    return list.filter(l => validKeyList.some(e => e in l));
  }

  /**
   * Return elements where number key in range value
   */
  static filterRange(list, key, lower, upper) {
    return list.filter(item => item[key] <= upper && item[key] >= lower);
  }

  /**
   * Create KPF object from YAML text strings.
   * @param {String} activityText
   * @param {String} geometryText
   */
  static fromText(activityText, geometryText, typeText) {
    let activityJson = null;
    if (activityText) {
      activityJson = yaml.safeLoad(activityText).map(a => ({ ...a.act }));
    }
    const geometryJson = yaml.safeLoad(geometryText).map(g => ({ ...g.geom }));
    const typeJson = yaml.safeLoad(typeText).map(t => ({ ...t.types }));
    return new KPF(activityJson, geometryJson, typeJson);
  }

  /**
   * Create KPF from js file handles.
   * @param {File} activityFile
   * @param {File} geometryFile
   */
  static async fromFiles(activityFile, geometryFile, typeFile) {
    const promiseList = [];
    promiseList.push(readUploadedFileAsText(geometryFile));
    promiseList.push(readUploadedFileAsText(typeFile, '- {}'));
    if (activityFile) {
      promiseList.push(readUploadedFileAsText(activityFile));
    }
    const [geometryText, typeText, activityText] = await Promise.all(promiseList);
    return KPF.fromText(activityText, geometryText, typeText);
  }
}
