<script>
import TimeBus from '../utils/timebus';

export default {
  props: {
    width: {
      type: Number,
      required: true
    },
    height: {
      type: Number,
      required: true
    },
    playing: {
      type: Boolean,
      requried: true,
    },
    playbackRate: {
      type: Number,
      required: true,
    },
    src: {
      type: String,
      required: true,
    },
    crossorigin: {
      type: Boolean,
      required: true,
    },
    timebusName: {
      type: String,
      default: 'master'
    },
    // Warning: Unmuting can impact autoplay on some browsers.
    muted: {
      type: Boolean,
      default: true,
    },
    update: {
      type: Function,
      required: true,
    },
    setTimeGetter: {
      type: Function,
      required: true,
    },
  },

  data(){
    return {
      video: null,
    };
  },

  watch: {
    playbackRate(newval) {
      this.video.playbackRate = newval;
    },

    playing(playing) {
      const v = this.video;
      if (playing) {
        v.play();
        this.update(false);
      } else {
        v.pause();
      }
    },

    src(newval) {
      this.video.load();
    }
  },

  beforeDestroy() {
    TimeBus.$off(`${this.timebusName}:active`, this._updateTime);
    TimeBus.$off(`${this.timebusName}:skip`, this._skip);
  },

  mounted() {
    this.video = this.$refs.video;
    TimeBus.$on(`${this.timebusName}:active`, this._updateTime);
    TimeBus.$on(`${this.timebusName}:skip`, this._skip);
    this.setTimeGetter(this.getTime);
  },

  methods: {
    _updateTime(time) {
      this.video.currentTime = time;
      this.update();
    },

    _skip(direction) {
      this.video.currentTime += direction * 5;
      this.update();
    },

    _canPlay() {
      const { playing, video } = this;
      if (playing) {
        video.play();
        this.update(false);
      } else {
        this.update();
      }
      const { videoWidth, videoHeight, duration } = this.video;
      this.$emit('init', { width: videoWidth, height: videoHeight, duration });
    },

    getTime() {
      return this.video.currentTime;
    },
  }
}
</script>

<template lang="pug">
video(ref="video", v-bind="{ crossorigin, width, height, muted }", @canplay="_canPlay")
  source(v-bind="{ src }", @error="$emit('error', $event)")
  h1 Could not load video.
</template>
