<template lang="pug">
span.px-1 {{ now }} / {{ end }}
</template>

<script>
import TimeBus from '../utils/timebus';

export default {
  props: {
    timebusName: {
      type: String,
      default: 'master',
    },
    offset: {
      type: Number, // Seconds
      default: 0,
    },
    duration: {
      type: Number, // Seconds
      required: true,
    },
    framerate: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      frame: 0,
    };
  },
  mounted() {
    TimeBus.$on(`${this.timebusName}:passive`, this.updateTime);
  },
  beforeDestroy() {
    TimeBus.$off(`${this.timebusName}:passive`, this.updateTime);
  },
  methods: {
    updateTime(frame) {
      this.frame = frame;
    },
    pad(num) {
      return num < 10 ? `0${num}` : num;
    },
    toTimeStamp(frame) {
      const seconds = frame / this.framerate;
      const min = Math.floor(seconds / 60);
      const sec = Math.floor(seconds % 60);
      return `${this.pad(min)}:${this.pad(sec)}`;
    },
  },
  computed: {
    now() { return this.toTimeStamp(this.frame) },
    end() { return this.toTimeStamp((this.offset + this.duration) * this.framerate) },
  },
}
</script>
