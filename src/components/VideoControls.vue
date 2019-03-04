<template lang="pug">
v-toolbar.video-controls(shift, dense)
  v-layout(row, align-center, wrap)
    v-flex(shrink)
      v-btn(icon, @click="skip(false)")
        v-icon skip_previous
      v-btn(icon, @click="setPlaying({ playing: !localPlaying })")
        v-icon(v-show="localPlaying") pause
        v-icon(v-show="!localPlaying") play_arrow
      v-btn(icon, @click="skip(true)")
        v-icon skip_next
      //- span.px-1 {{ toTimeStamp(time) }} / {{ toTimeStamp(localOffset + localDuration) }}
    v-flex.shrink
      v-select.px-2(
          @change="setPlaybackRate({ playbackRate: $event })",
          :items="playbackRateOptions",
          :value="localPlaybackRate",
          solo)
        template(slot="item", slot-scope="props")
          p {{ `${props.item}x Speed` }}
        template(slot="selection", slot-scope="props")
          span {{ `${props.item}x Speed`}}
    v-spacer
    v-flex.shrink
      v-switch.px-2.flat(
          label="labels",
          hide-details,
          :input-value="localShowLabels",
          @change="setShowLabels({ labels: $event })")
    v-flex.shrink
      v-switch.px-2.flat(
          label="shapes",
          hide-details,
          :input-value="localShowShapes",
          @change="setShowShapes({ shapes: $event })")
    v-flex.shrink
      v-select.px-2(
          @change="updateColorBy",
          :items="Object.keys(colorByOptions).map(c => colorByOptions[c])",
          solo,
          :value="colorByOptions[localColorBy]")
</template>

<script>
import { mapState, mapMutations, mapActions } from 'vuex';
import TimeBus from '../utils/timebus';

export default {
  props: {
    colorByOptions: {
      type: Object,
      required: true,
    },
    playbackRateOptions: {
      type: Array,
      default: () => [0.0625, 0.2, 0.5, 1, 2, 5],
    },
    withslider: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      scrubbing: false,
      time: 0, // in seconds

      // Performance hacks,
      localPlaybackRate: 1,
      localColorBy: '',
      localDuration: 0,
      localOffset: 0,
      localShowLabels: false,
      localShowShapes: false,
      localPlaying: false,
    };
  },
  mounted() {
    // read from the passive clock to keep the scrubber up to date.
    TimeBus.$on('passive', time => (this.time = time));
    this.$store.watch((store) => {
      this.setFromStore(store);
    });
  },
  methods: {
    ...mapMutations([
      'setPlaying',
      'setPlaybackRate',
      'setShowLabels',
      'setShowShapes',
    ]),
    ...mapActions([
      'groupByMeta',
    ]),
    setFromStore(store) {
      this.localPlaybackRate = store.playbackRate;
      this.localColorBy = store.colorBy;
      this.localDuration = store.duration;
      this.localOffset = store.offset;
      this.localShowLabels = store.labels;
      this.localShowShapes = store.shapes;
      this.localPlaying = store.playing;
    },
    pad(num) {
      return num < 10 ? `0${num}` : num;
    },
    toTimeStamp(seconds) {
      const min = Math.floor(seconds / 60);
      const sec = Math.floor(seconds % 60);
      return `${this.pad(min)}:${this.pad(sec)}`;
    },
    updateColorBy(event) {
      this.groupByMeta({
        key: Object.keys(this.colorByOptions).find(c => this.colorByOptions[c] === event),
      });
    },
    skip(direction) {
      if (direction) {
        TimeBus.$emit('active', this.time + 5);
      } else {
        TimeBus.$emit('active', this.time > 5 ? this.time - 5 : 0);
      }
    },
  },
};
</script>

<style lang='stylus'>
.video-controls {
  .v-input {
    padding-top: 0;
  }

  .v-input--switch {
    padding-top: 0;
  }

  .v-input.v-text-field--solo .v-input__control {
    min-height: 1px;
    width: 200px;
  }

  .v-input__slot {
    margin: 0;
  }
}

.video-controls .v-toolbar__content {
  padding: 0 !important;
  height: inherit !important;
}
</style>
