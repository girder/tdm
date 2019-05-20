<script>
import TimeBus from '../utils/timebus';

export default {
  props: {
    timebusName: {
      type: String,
      default: 'master',
    },
    duration: {
      type: Number, // Seconds
      required: true,
    },
    offset: {
      type: Number, // Seconds
      default: 0,
    },
    framerate: {
      type: Number,
      default: 30,
    },
    /* Array<{
     *   name: String, // name of the follower bus.
     *   distance: Number // scalar distance from master.
     * }>
     */
    followers: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      time: 0, // in seconds
    };
  },
  mounted() {
    TimeBus.$on(`${this.timebusName}:passive`, time => (this.time = time));
  },
  computed: {
    step() {
      return 1 / this.framerate;
    },
  },
  methods: {
    progressChangeInput(e) {
      const value = parseFloat(e.target.value);
      const fixed = parseFloat(value.toFixed(3));
      TimeBus.$emit(`${this.timebusName}:active`, fixed + this.offset);
      // Emit follower updates
      this.followers.forEach(follower => {
        TimeBus.$emit(`${follower.name}:active`, fixed + this.offset + follower.distance);
      });
    },
  },
};
</script>

<template lang="pug">
input.slider.py-0(type="range",
    :value="time - offset",
    :max="duration",
    :step="step",
    @input="progressChangeInput")
</template>
