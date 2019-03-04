/* eslint no-param-reassign: 0 */
/* eslint no-shadow: 0 */

import Vue from 'vue';
import Vuex from 'vuex';

import { interpolateFrames, STATES } from '../utils/tdm';
import { SORT_RESOLUTION, CONTRAST_COLORS, SEQUENCE_COLORS, DISABLED_COLOR } from '../constants';

Vue.use(Vuex);

const state = {
  /* TDM State */
  tracks: [], // Array<Track>
  statemap: {}, // Object<String, TrackState> map of metadata value to state
  colormap: {}, // Object<String, Color> map of metadata value to color
  cache: {}, // Object<String, Array<Track>> reverse map of metadata value to tracks with that value
  colorBy: '', // String metadata category to color by
  preselect: '', // String metadata value.

  /**
   * Object<String, Object<Number, Array<Detection>>>
   * map Track.key -> (map key -> []detection)
   */
  sortedTracks: {},

  /* Video state */
  url: '',
  width: 1920,
  height: 1080,
  framerate: 30,
  duration: 300, // seconds
  offset: 0, // seconds

  /* Control state */
  playbackRate: 1,
  labels: true,
  shapes: true,
  playing: true,
};

const getters = {

  activeContinuousFrames: state => (frametime) => {
    const continuousFrames = [];
    const f = Math.floor(frametime);
    const key = Math.floor(f / SORT_RESOLUTION) * SORT_RESOLUTION;

    state.tracks.forEach((track) => {
      const sorted = state.sortedTracks[track.key];
      if (!track.interpolated && key in sorted) {
        const detections = sorted[key];
        const firstDetectionTime = detections[0].frame;
        const detectionIndex = f - firstDetectionTime;
        if (detectionIndex >= 0 && detections.length > detectionIndex) {
          continuousFrames.push(detections[detectionIndex]);
        }
      }
    });
    return continuousFrames;
  },

  activeKeyFrames: state => (frametime) => {
    const frames = state.tracks
      .filter(trackinfo => trackinfo.interpolated)
      .map((trackinfo) => {
        const track = trackinfo.detections;
        for (let i = 0; i < track.length - 1; i += 1) {
          const d0 = track[i];
          const d1 = track[i + 1];
          if (frametime >= d0.frame && frametime <= d1.frame) {
            return interpolateFrames(frametime, d0, d1);
          }
        }
        return null;
      })
      .filter(track => track !== null);
    return frames;
  },
};

const mutations = {
  bucketSort: (state) => {
    state.sortedTracks = {};
    state.tracks.forEach((track) => {
      if (!(track.key in state.sortedTracks)) {
        const bucket = {};
        track.detections.forEach((d) => {
          const key = Math.floor(d.frame / SORT_RESOLUTION) * SORT_RESOLUTION;
          if (key in bucket) {
            bucket[key].push(d);
          } else {
            bucket[key] = [d];
          }
        });
        Object.keys(bucket).forEach((k) => {
          bucket[k] = bucket[k].sort((a, b) => a.frame - b.frame);
        });
        state.sortedTracks[track.key] = bucket;
      }
    });
  },

  colorByMeta(state, { key }) {
    const assignedColors = {};
    const cache = {};
    let counter = 0;
    state.tracks.forEach((track) => {
      const val = track.meta[key];
      if (val in assignedColors) {
        track.color = assignedColors[val];
        cache[val].push(track);
      } else {
        const color = CONTRAST_COLORS[counter % CONTRAST_COLORS.length];
        track.color = color;
        assignedColors[val] = color;
        cache[val] = [track];
        counter += 1;
      }
    });
    state.cache = cache;
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
      track.color = color;
    });
    state.colormap = assignedColors;
  },

  resetState(state, { newstate }) {
    const enabledMap = {};
    state.tracks.forEach((track) => {
      track.state = newstate;
      enabledMap[track.meta[state.colorBy]] = newstate;
    });
    state.statemap = enabledMap;
  },

  setColorBy(state, { colorBy }) {
    state.colorBy = colorBy;
  },
  setPreselect(state, { preselect }) {
    state.preselect = preselect;
  },
  setTracks(state, { tracks }) {
    state.tracks = tracks;
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
        track.state = newState;
        enabledMap[track.meta[key]] = newState;
      } else if (xor) { // flip state where value doesn't match
        track.state = elseState;
        enabledMap[track.meta[key]] = elseState;
      } else { // preserve state where value doesn't match
        enabledMap[track.meta[key]] = track.state;
      }
    });
    state.statemap = enabledMap;
  },
};

const actions = {
  /**
   * Serialize tracks to JSON string.
   */
  setTracks({ commit }, { tracks, key }) {
    commit('setTracks', { tracks });
    commit('colorByMeta', { key });
    commit('bucketSort');
    commit('resetState', { newstate: STATES.ACTIVE });
  },

  addTracks({ state, commit }, { tracks, key }) {
    commit('setTracks', { tracks: state.tracks.concat(tracks) });
    commit('colorByMeta', { key });
    commit('bucketSort');
    commit('resetState', { newstate: STATES.ACTIVE });
  },

  groupByMeta({ commit }, { key }) {
    commit('colorByMeta', { key });
    commit('resetState', { newstate: STATES.ACTIVE });
  },
};

export default new Vuex.Store({
  state,
  getters,
  actions,
  mutations,
});
