<template lang="pug">
input.slider.py-1(type="range",
    :value="time - offset",
    :max="duration",
    :step="step",
    @input="progressChangeInput")
</template>

<script>
import { mapState, mapMutations } from 'vuex';
import TimeBus from '../utils/timebus';

export default {
  data() {
    return {
      time: 0, // in seconds
    };
  },
  mounted() {
    TimeBus.$on('active', time => (this.time = time));
    TimeBus.$on('passive', time => (this.time = time));
  },
  computed: {
    ...mapState({
      duration: 'duration',
      framerate: 'framerate',
      offset: 'offset',
    }),
    step() {
      return 1 / this.framerate;
    },
  },
  methods: {
    progressChangeInput(e) {
      const value = parseFloat(e.target.value);
      const fixed = parseFloat(value.toFixed(3));
      TimeBus.$emit('active', fixed + this.offset);
    },
  },
};
</script>
