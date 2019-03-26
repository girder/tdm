<template lang="pug">
span.px-1 {{ toTimeStamp(time) }} / {{ end }}
</template>

<script>
import { createNamespacedHelpers } from 'vuex'
const { mapState } = createNamespacedHelpers('tdm')
import TimeBus from '../utils/timebus';

export default {
  data() {
    return {
      time: 0,
    };
  },
  mounted() {
    TimeBus.$on('master:passive', this.updateTime);
  },
  beforeDestroy() {
    TimeBus.$off('master:passive', this.updateTime)
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
    ...mapState(['offset', 'duration']),
    end() { return this.toTimeStamp(this.offset + this.duration) },
  },
}
</script>
