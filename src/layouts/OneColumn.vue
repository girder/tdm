<script>
import { createNamespacedHelpers } from 'vuex';

import {
  AnnotationContainer,
  VideoControls,
  TdmTemporal,
  EventListWidget,
  TdmTable,
  SourceVideo } from '../components';
import MultiVideo from './MultiVideo';
import TwoColumn from './TwoColumn';
import { getParams } from '../utils';
import TimeBus from '../utils/timebus';

const { mapState } = createNamespacedHelpers('tdm');

export default {
  components: {
    EventListWidget,
    TdmTemporal,
    VideoControls,
    MultiVideo,
    TdmTable,
    TwoColumn,
    AnnotationContainer,
    SourceVideo,
  },

  props: {
    duration: {
      type: Number,
      required: true,
    },
    src: {
      type: String,
      required: true,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    meta: {
      type: Object,
      default: () => {},
    },
    followers: {
      type: Array,
      default: () => [],
    },
    fileListVisible: {
      type: Boolean,
      default: true,
    },
  },

  data() {
    return {
      containerWidth: 1137, // Standard Container Width
      containerHeight: 0,
      sourceWidth: 0,
      sourceHeight: 0,
      widgetHeight: "142px",
      tabHeight: 36,
      activeListTab: null,
      // Controls
      playing: false,
      playbackRate: 1,
      framerate: 30,
    };
  },

  computed: mapState([
    'cache',
    'thresholdedEvents',
    'tracks',
    'threshold',
    'colormap',
    'statemap',
  ]),

  beforeDestroy () {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.onResize, { passive: true })
    }
  },

  mounted () {
    this.onResize();
    window.addEventListener('resize', this.onResize, { passive: true });
  },

  watch: {
    cache: {
      immediate: true,
      handler() {
        this.$nextTick(() => this.widgetHeight = (this.$refs.temporal.$el.clientHeight - this.tabHeight) + 'px');
      },
    },
  },

  methods: {
    init({ width, height, duration }){
      this.sourceWidth = width;
      this.sourceHeight = height;
      this.$emit('update:duration', duration);
    },

    onResize () {
      this.containerWidth = this.$refs['multiregion'].$el.clientWidth;
    },

    scrubToEvent(event){
      const fixed = event.begin / this.framerate;
      TimeBus.$emit('master:active', fixed);
      this.followers.forEach(follower => {
        TimeBus.$emit(`${follower.name}:active`, fixed + follower.distance);
      });
    },
  },
}
</script>

<template lang="pug">
v-layout(column)
  slot(name="title")

  multi-video(ref="multiregion",
      :width="containerWidth",
      :aspect="sourceWidth / sourceHeight",
      :child-count="followers.length")
    template(#main="{ width }")
      annotation-container(
          v-bind="{ containerWidth, containerHeight, sourceWidth, sourceHeight }",
          :src="src",
          :loading="loading")
        template(#source="{ width, height, src, update }")
          source-video(
              @init="init",
              v-bind="{ width, height, duration, src, update, playing, playbackRate, framerate }")

    //- template(#child="{ width, index }")
    //-   video-region(
    //-       dismissable=true,
    //-       @dismiss="followers.splice(index, 1)",
    //-       :width="width",
    //-       :label-format="labelFormat",
    //-       :line-width="3",
    //-       :timebus-name="followers[index].name",
    //-       :persist="false")

  video-controls(
      :duration="duration",
      :color-by-options="meta",
      :with-toggles="true",
      :playing.sync="playing",
      :playback-rate.sync="playbackRate")
    template(#widget)
      v-btn(color="primary", small,
          @click="$emit('update:fileListVisible', !fileListVisible)") File List
        v-icon.pl-2(v-if="!fileListVisible") {{ $vuetify.icons.formList }}
        v-icon.pl-2(v-else) {{ $vuetify.icons.close }}

  v-card.my-2(v-show="fileListVisible")
    slot(name="filelist", @close="this.$emit('update:fileListVisible', false)")

  two-column(:width="containerWidth")
    template(#main="{ width }")
      tdm-temporal.no-transition(
          :events="thresholdedEvents",
          :threshold-tracks="tracks",
          :duration="duration",
          :threshold="threshold",
          :colormap="colormap",
          :statemap="statemap",
          ref="temporal"
          :outerwidth="width",
          :followers="followers",
          @update:followers="$emit('update:followers', $event)")
    template(#widget="{ width }")
      v-card(tile)
        v-tabs(v-model="activeListTab", color="secondary", dark, :height="tabHeight")
          v-tab(key="events") Events
          v-tab(key="tracks") Tracks
          v-tab-item(key="events", :style="{ height: widgetHeight }")
            event-list-widget(
                :events="thresholdedEvents",
                @click="scrubToEvent")
          v-tab-item(key="tracks", :style="{ height: widgetHeight }")
            tdm-table(
                v-bind="{ meta }",
                @click="scrubToEvent")
</template>

