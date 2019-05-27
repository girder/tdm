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

  computed: {
    frameduration() {
      return Math.round(this.duration * this.framerate);
    },
    frameoffset() {
      return Math.round(this.offset * this.framerate);
    },
  },

  methods: {
    setTime(frame) {
      this.frame = frame;
    },

    progressChangeInput(e) {
      const value = Math.round(parseFloat(e.target.value)); // Frames
      TimeBus.$emit(`${this.timebusName}:active`,value + this.frameoffset);
      // Emit follower updates
      // this.followers.forEach(follower => {
      //   TimeBus.$emit(`${follower.name}:active`, value + this.frameoffset + follower.distance);
      // });
    },
  },
};
</script>

<template lang="pug">
input.slider.py-0(type="range",
    :value="frame - frameoffset",
    :max="frameduration",
    :step="stepsize",
    @input="progressChangeInput")
</template>
