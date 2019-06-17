/* eslint no-param-reassign: 0 */
/* eslint no-shadow: 0 */

import Vue from 'vue';
import Vuex from 'vuex';

import { binarySearch } from '../utils';
import { eventsForThreshold, STATES, interpolateFrames } from '../utils/tdm';
import { CONTRAST_COLORS, SEQUENCE_COLORS, DISABLED_COLOR } from '../constants';

Vue.use(Vuex);

const state = {
  /* TDM State */
  // tracks: [], // Array<Track>
  statemap: {}, // Object<String, TrackState> map of metadata value to state
  colormap: {}, // Object<String, Color> map of metadata value to color
  // cache: {}, // Object<String, Array<Track>> reverse
  // map of metadata value to tracks with that value
  colorBy: '', // String metadata category to color by
  preselect: '', // String metadata value.
  notifier: { notify: () => {} },
  /* Video state: optional, can control per-component */
  url: '',
  width: 1920,
  height: 1080,
  framerate: 30,
  duration: 9000, // frames
  originalDuration: 9000, // frames
  offset: 0, // seconds
  /* Control state */
  playbackRate: 1,
  labels: false,
  shapes: true,
  playing: false,
  zoom: 1,

  /* Threshold and derived properties */
  threshold: null, // threshold disabled by default
  thresholdKey: 'confidence',
  // thresholdedEvents: {}, // Array<Array<Event>>
  thresholdMin: 0,
  thresholdMax: 1,

  /* Canary variables for non-reactive props */
  tracksCanary: 0,
  cacheCanary: 0,
  thresholdedEventsCanary: 0,
};

const getters = {

  getTrack: state => key => state.tracks.find(t => t.key === key),

  activeContinuousFrames: state => (startframe, endframe) => {
    let start = Math.round(startframe);
    let end = Math.round(endframe + 1); // include the last frame
    if (endframe < startframe) {
      start = Math.round(endframe);
      end = Math.round(endframe + 1);
    }
    if (start < 0 || end < 0) {
      return [];
    }
    return state.tracks
      // .filter(trackinfo => !trackinfo.interpolated)
      .filter(track => track.begin <= start)
      .map((track) => {
        let starti = binarySearch(track.detections, { frame: start }, (a, b) => a.frame - b.frame);
        if (starti < 0) {
          starti = Math.abs((starti + 1) * -1);
        }
        const ret = [];
        if (starti > 0 && starti < track.detections.length) {
          ret.push(interpolateFrames(
            start,
            track.detections[starti - 1],
            track.detections[starti],
          ));
        } else if (starti === 0) {
          ret.push(track.detections[starti]);
        } else {
          ret.push(track.detections[starti - 1]);
        }
        let detection = track.detections[starti];
        while (detection && detection.frame <= end) {
          ret.push(detection);
          starti += 1;
          detection = track.detections[starti];
        }
        if (detection && detection.frame > end) {
          ret.push(interpolateFrames(
            end,
            track.detections[starti - 1],
            track.detections[starti],
          ));
        }
        return {
          track,
          detections: ret,
        };
      });
  },
};

const mutations = {
  init() {
    // Initialize non-reactive properties
    state.tracks = [];
    state.cache = {};
    state.thresholdedEvents = {};
  },

  colorByMeta(state, { key }) {
    const assignedColors = {};
    const cache = {};
    let counter = 0;
    state.tracks.forEach((track) => {
      const val = track.meta[key];
      if (val in assignedColors) {
        cache[val].push(track);
      } else {
        const color = CONTRAST_COLORS[counter % CONTRAST_COLORS.length];
        assignedColors[val] = color;
        cache[val] = [track];
        counter += 1;
      }
    });
    state.cache = cache;
    state.cacheCanary += 1;
    state.thresholdedEvents = eventsForThreshold(cache, state.threshold, state.thresholdKey);
    state.thresholdedEventsCanary += 1;
    state.colormap = assignedColors;
    state.colorBy = key;
  },

  colorByBucketSequence(state, { key }) {
    const assignedColors = {};
    state.tracks.forEach((track) => {
      const value = track.meta[key] || -1;
      const i = Math.floor(value / SEQUENCE_COLORS.length);
      const color = i >= 0 ? SEQUENCE_COLORS[i] : DISABLED_COLOR;
      assignedColors[value] = color;
    });
    state.colormap = assignedColors;
  },

  addMetaKeys(state, metalist) {
    metalist.forEach((meta, i) => {
      state.colormap[meta.name] = CONTRAST_COLORS[i % CONTRAST_COLORS.length];
      state.statemap[meta.name] = STATES.ACTIVE;
    });
  },

  resetState(state, { newstate }) {
    const enabledMap = {};
    state.tracks.forEach((track) => {
      enabledMap[track.meta[state.colorBy]] = newstate;
    });
    state.statemap = enabledMap;
  },

  setPreselect(state, { preselect }) {
    state.preselect = preselect;
  },
  setTracks(state, { tracks }) {
    tracks.forEach((track) => {
      track.detections = track.detections.sort((a, b) => a.frame - b.frame);
    });
    state.tracks = tracks;
    state.tracksCanary += 1;
  },

  removeTrack(state, { key }) {
    state.tracks = state.tracks.filter(t => t.key !== key);
    state.tracksCanary += 1;
  },

  editTrack(state, { track }) {
    const index = state.tracks.findIndex(t => t.key === track.key);
    if (index >= 0) {
      state.tracks[index] = track;
      state.tracksCanary += 1;
    }
  },

  setDetection(state, { trackKey, frame, detection, remove = false }) {
    const track = state.tracks.find(t => t.key === trackKey);
    if (track) {
      const position = binarySearch(track.detections, { frame }, (a, b) => a.frame - b.frame);
      if (position >= 0) {
        if (remove) {
          track.detections.splice(position, 1);
        } else {
          track.detections[position] = detection;
        }
        // Vue.set(track.detections, position, detection);
      } else if (!remove) {
        track.detections.splice((position * -1) - 1, 0, detection);
      }
    } else {
      throw new Error(`Track ${trackKey} not found`);
    }
  },

  setNotifier(state, { notifier }) {
    state.notifier = notifier;
  },

  /* Video Mutation */

  setUrl(state, { url }) {
    state.url = url;
  },
  setWidth(state, { width }) {
    state.width = width;
  },
  setHeight(state, { height }) {
    state.height = height;
  },
  setDuration(state, { duration }) {
    state.duration = duration;
  },
  setOriginalDuration(state, { duration }) {
    state.originalDuration = duration;
  },
  setFramerate(state, { framerate }) {
    state.framerate = framerate;
  },
  setOffset(state, { offset }) {
    state.offset = offset;
  },

  /* Control Mutation */

  setPlaybackRate(state, { playbackRate }) {
    state.playbackRate = playbackRate;
  },
  setShowLabels(state, { labels }) {
    state.labels = labels;
  },
  setShowShapes(state, { shapes }) {
    state.shapes = shapes;
  },
  setPlaying(state, { playing }) {
    state.playing = playing;
  },
  setZoom(state, { zoom }) {
    state.zoom = zoom;
  },

  /* Threshold Mutation */
  setThreshold(state, { threshold }) {
    state.thresholdedEvents = eventsForThreshold(state.cache, threshold, state.thresholdKey);
    state.threshold = threshold;
  },
  setThresholdKey(state, { thresholdKey }) {
    state.thresholdKey = thresholdKey;
  },
  setThreshBounds(state, { min, max }) {
    state.thresholdMin = min || 0;
    state.thresholdMax = max || 1;
  },

  /**
   * Enable or disable tracks by meta key
   * @param {String} key
   * @param {Any} value
   * @param {Boolean} newState state to set iff key = value
   * @param {Boolean} elseState state to set iff key != value
   * @param {Boolean} xor whether or not to set elseState if else condition
   * @returns {Object<String, Boolean>} value to enabled map
   */
  toggleByMeta(state, {
    value,
    newState = STATES.DISABLED,
    elseState = STATES.ACTIVE,
    xor = false,
  }) {
    const key = state.colorBy;
    const enabledMap = {};
    state.tracks.forEach((track) => {
      if (String(track.meta[key]) === value) {
        enabledMap[track.meta[key]] = newState;
      } else if (xor) { // flip state where value doesn't match
        enabledMap[track.meta[key]] = elseState;
      }
    });
    state.statemap = enabledMap;
  },
};

const actions = {

  _notify({ state }) {
    state.notifier.notify({
      tracks: state.tracks,
      statemap: state.statemap,
      colormap: state.colormap,
      cache: state.cache,
      colorBy: state.colorBy,
    });
  },

  /**
   * Serialize tracks to JSON string.
   */
  setTracks({ commit, dispatch }, { tracks, key }) {
    commit('setTracks', { tracks });
    commit('colorByMeta', { key });
    commit('resetState', { newstate: STATES.ACTIVE });
    dispatch('_notify');
  },

  addTracks({ state, commit, dispatch }, { tracks, key }) {
    commit('setTracks', { tracks: state.tracks.concat(tracks) });
    commit('colorByMeta', { key });
    commit('resetState', { newstate: STATES.ACTIVE });
    dispatch('_notify');
  },

  editTrack({ state, commit, dispatch }, { track }) {
    commit('editTrack', { track });
    commit('colorByMeta', { key: state.colorBy });
    dispatch('_notify');
  },

  removeTrack({ state, commit, dispatch }, { key }) {
    commit('removeTrack', { key });
    commit('colorByMeta', { key: state.colorBy });
    commit('resetState', { newstate: STATES.ACTIVE });
    dispatch('_notify');
  },

  removeTracks({ commit, dispatch }) {
    commit('setTracks', { tracks: [] });
    commit('resetState', { newstate: STATES.ACTIVE });
    dispatch('_notify');
  },

  groupByMeta({ commit, dispatch }, { key }) {
    commit('colorByMeta', { key });
    commit('resetState', { newstate: STATES.ACTIVE });
    dispatch('_notify');
  },

  resetState({ commit, dispatch }, { newState }) {
    commit('resetState', { newState });
    dispatch('_notify');
  },

  toggleByMeta({ commit, dispatch }, {
    value,
    newState = STATES.DISABLED,
    elseState = STATES.ACTIVE,
    xor = false,
  }) {
    commit('toggleByMeta', {
      value, newState, elseState, xor,
    });
    dispatch('_notify');
  },
};

export default new Vuex.Store({
  modules: {
    tdm: {
      namespaced: true,
      state,
      getters,
      actions,
      mutations,
    },
  },
});

// Export if needed to register with another vuex store
// MUST be registered under `tdm` namespace
export {
  state,
  getters,
  actions,
  mutations,
};
