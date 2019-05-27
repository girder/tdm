<script>
import { createNamespacedHelpers } from 'vuex';
import TimeStamp from './TimeStamp';
import TimeBus from '../utils/timebus';

const { mapState, mapMutations, mapActions } = createNamespacedHelpers('tdm');

export default {
  props: {
    colorByOptions: {
      type: Object,
      required: true,
    },
    duration: {
      type: Number, // Seconds
      required: true,
    },
    offset: {
      type: Number, // Seconds
      default: 0,
    },
    playing: {
      type: Boolean,
      required: true,
    },
    playbackRate: {
      type: Number,
      default: 1,
    },
    playbackRateOptions: {
      type: Array,
      default: () => [0.0625, 0.2, 0.5, 1, 2, 5],
    },
    withToggles: {
      type: Boolean,
      default: true,
    },
    timebusName: {
      type: String,
      default: 'master',
    },
    skipAmount: {
      type: Number,
      default: 30, // in FRAMES
    },
    framerate: {
      type: Number,
      required: true
    },
  },

  components: { TimeStamp },

  data() {
    return { scrubbing: false };
  },

  computed: mapState([
    'colorBy',
    'labels',
    'shapes',
  ]),

  methods: {
    ...mapMutations([
      'setShowLabels',
      'setShowShapes',
    ]),

    ...mapActions([
      'groupByMeta',
    ]),

    updateColorBy(event) {
      this.groupByMeta({
        key: Object.keys(this.colorByOptions).find(c => this.colorByOptions[c] === event),
      });
    },

    skip(amount) {
      TimeBus.$emit(`${this.timebusName}:skip`, amount);
    },
  },
};
</script>

<template lang="pug">
v-toolbar.video-controls(shift, dense)
  v-layout(row, align-center, wrap)
    v-flex(shrink)
      v-btn(icon, @click="skip(skipAmount * -1)")
        v-icon {{ $vuetify.icons.skipPrevious }}
      v-btn(icon, @click="$emit('update:playing', !playing )")
        v-icon(v-show="playing") {{ $vuetify.icons.pause }}
        v-icon(v-show="!playing") {{ $vuetify.icons.play }}
      v-btn(icon, @click="skip(skipAmount)")
        v-icon {{ $vuetify.icons.skipNext }}
      time-stamp(v-bind="{ duration, offset, timebusName, framerate }")
    v-flex.shrink
      v-select.px-2(
          @change="$emit('update:playbackRate', $event )",
          :items="playbackRateOptions",
          :value="playbackRate",
          solo)
        template(slot="item", slot-scope="props")
          p {{ `${props.item}x Speed` }}
        template(slot="selection", slot-scope="props")
          span {{ `${props.item}x Speed`}}
    v-flex
      slot(name="widget")
    v-flex.shrink
      v-switch.px-2.flat(
          v-if="withToggles"
          label="labels",
          hide-details,
          :input-value="labels",
          @change="setShowLabels({ labels: $event })")
    v-flex.shrink
      v-switch.px-2.flat(
          v-if="withToggles"
          label="shapes",
          hide-details,
          :input-value="shapes",
          @change="setShowShapes({ shapes: $event })")
    v-flex.shrink
      v-select.px-2(
          v-if="withToggles"
          @change="updateColorBy",
          :items="Object.keys(colorByOptions).map(c => colorByOptions[c])",
          solo,
          :value="colorByOptions[colorBy]")
</template>

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
