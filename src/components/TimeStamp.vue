<template lang="pug">
span.px-1 {{ toTimeStamp(time) }} / {{ end }}
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
  },
  data() {
    return {
      time: 0,
    };
  },
  mounted() {
    TimeBus.$on(`${this.timebusName}:passive`, this.updateTime);
  },
  beforeDestroy() {
    TimeBus.$off(`${this.timebusName}:passive`, this.updateTime);
  },
  methods: {
    updateTime(time) {
      this.time = time;
    },
    pad(num) {
      return num < 10 ? `0${num}` : num;
    },
    toTimeStamp(seconds) {
      const min = Math.floor(seconds / 60);
      const sec = Math.floor(seconds % 60);
      return `${this.pad(min)}:${this.pad(sec)}`;
    },
  },
  computed: {
    end() { return this.toTimeStamp(this.offset + this.duration) },
  },
}
</script>
