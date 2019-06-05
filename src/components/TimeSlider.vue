<script>
import TimeBus from '../utils/timebus';

export default {
  props: {
    timebusName: {
      type: String,
      default: 'master',
    },
    duration: {
      type: Number, // Frames
      required: true,
    },
    offset: {
      type: Number, // Frames
      default: 0,
    },
    stepsize: {
      type: Number, // Frames
      default: 30
    },
    /* Array<{
     *   name: String, // name of the follower bus.
     *   distance: Number // scalar distance from master.
     * }>
     */
    // followers: {
    //   type: Array,
    //   default: () => [],
    // },
  },

  data() {
    return {
      frame: 0, // in frames
    };
  },

  mounted() {
    TimeBus.$on(`${this.timebusName}:passive`, this.setTime);
  },

  beforeDestroy() {
    TimeBus.$off(`${this.timebusName}:passive`, this.setTime);
  },

  methods: {
    setTime(frame) {
      this.frame = frame;
    },

    progressChangeInput(e) {
      const value = Math.round(parseFloat(e.target.value)); // Frames
      TimeBus.$emit(`${this.timebusName}:active`, value + this.offset);
    },
  },
};
</script>

<template lang="pug">
input.slider.py-0(type="range",
    :value="frame - offset",
    :max="duration",
    :step="stepsize",
    @input="progressChangeInput")
</template>
