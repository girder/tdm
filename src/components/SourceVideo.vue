<script>
import { debounce } from '../utils';
import TimeBus from '../utils/timebus';

let frametime = 0;

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
    duration: {
      type: Number,
      required: true,
    },
    playing: {
      type: Boolean,
      requried: true,
    },
    src: {
      type: String,
      required: true,
    },
    update: {
      type: Function,
      required: true,
    },
    playbackRate: {
      type: Number,
      default: 1,
    },
    offset: {
      type: Number,
      default: 0,
    },
    framerate: {
      type: Number,
      default: 30,
    },
    crossorigin: {
      type: Boolean,
      default: false,
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
  },

  data(){
    return {
      video: null,
      animationId: null,
      debounceLoop: () => {},
    };
  },

  watch: {
    playbackRate(playbackRate) {
      this.video.playbackRate = playbackRate;
    },

    playing(playing) {
      const v = this.video;
      if (playing) {
        v.play();
        this.loop(0, false);
      } else {
        v.pause();
      }
    },

    src(src) {
      this.video.load();
    },

    offset() {
      this.loop();
    },

    duration() {
      this.loop();
    },
  },

  beforeDestroy() {
    TimeBus.$off(`${this.timebusName}:active`, this.setCurrentTime);
    TimeBus.$off(`${this.timebusName}:skip`, this.skip);
  },

  mounted() {
    this.video = this.$refs.video;
    this.debounceLoop = debounce(this.loop, 2000);
    TimeBus.$on(`${this.timebusName}:active`, this.setCurrentTime);
    TimeBus.$on(`${this.timebusName}:skip`, this.skip);
  },

  methods: {
    broadcastTime(frame) {
      TimeBus.$emit(`${this.timebusName}:passive`, frame);
    },
  
    setCurrentTime(frame) {
      this.video.currentTime = parseFloat((frame / this.framerate).toFixed(6));
      this.loop();
    },

    skip(frameamount) {
      const { offset, duration } = this;
      const frametime = Math.round(this.video.currentTime * this.framerate);
      const delta = Math.round(frameamount);
      const newTime = frametime + delta; // integer frame
      if (newTime <= (offset + duration) && newTime >= offset) {
        this.video.currentTime = newTime / this.framerate;
      } else if (newTime < offset) {
        this.video.currentTime = offset / this.framerate;
      } else {
        this.video.currentTime = duration / this.framerate;
      }
      this.loop();
    },

    canPlay() {
      const { playing, video } = this;
      if (playing) {
        video.play();
        this.loop(0, false);
      } else {
        this.loop();
      }
      const { videoWidth, videoHeight, duration } = this.video;
      this.$emit('init', { width: videoWidth, height: videoHeight, duration });
    },

    loop(delta, prevent = true) {
      if (this.animationId && !prevent) {
        window.cancelAnimationFrame(this.animationId);
      }
      const { offset, duration, framerate, timebusName, playing } = this.$props;
      const lastframe = frametime;
      const thisFrame = Math.round(this.video.currentTime * this.framerate);
      // TODO: this logic can probably be simplified.
      if (thisFrame < offset && timebusName === 'master') {
        TimeBus.$emit(`${this.timebusName}:active`, offset);
      } else if (!prevent
          && thisFrame > (offset + duration)
          && timebusName === 'master') {
        this.$emit('update:playing', false);
        TimeBus.$emit(`${this.timebusName}:active`, duration);
      } else if ((thisFrame !== lastframe) || prevent) {
        frametime = thisFrame;
        // Only emit passive events to the master timebus
        if (this.timebusName === 'master') {
          this.broadcastTime(frametime);
        }
        this.update(frametime);
      }
      if (playing && !prevent) {
        this.animationId = window.requestAnimationFrame(d => this.loop(d, false));
      }
    },
  }
}
</script>

<template lang="pug">
video(ref="video", v-bind="{ crossorigin, width, height, muted }", @canplay="canPlay")
  source(v-bind="{ src }", @error="$emit('error', $event)")
  h1 Could not load video.
</template>
