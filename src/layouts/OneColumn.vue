<script>
import {
  VideoRegion,
  VideoControls,
  TdmTemporal,
  EventListWidget,
  TdmTable } from '../components';
import MultiVideo from './MultiVideo';
import TwoColumn from './TwoColumn';
import { getParams } from '../utils';
import TimeBus from '../utils/timebus';
import { mapState, mapMutations } from 'vuex';

export default {
  components: {
    EventListWidget,
    TdmTemporal,
    VideoControls,
    VideoRegion,
    MultiVideo,
    TdmTable,
    TwoColumn,
  },

  props: {
    autoplay: {
      type: Boolean,
      default: true,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    labelFormat: {
      type: Array,
      default: () => [],
    },
    colorBy: {
      type: String,
      default: '',
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
      widgetHeight: "142px",
      tabHeight: 36,
      activeListTab: null,
    };
  },

  computed: mapState({
    framerate: 'framerate',
    cache: 'cache',
    videoWidth: 'width',
    videoHeight: 'height',
  }),

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
    onResize () {
      this.containerWidth = this.$refs['video-region'].$el.clientWidth;
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

  multi-video(ref="video-region",
      :width="containerWidth",
      :aspect="videoWidth / videoHeight",
      :child-count="followers.length")
    template(#main="{ width }")
      video-region(
          :width="width",
          :label-format="labelFormat",
          :line-width="3",
          :loading="loading",
          timebus-name="master",
          @init="$emit('init')")
    template(#child="{ width, index }")
      video-region(
          dismissable=true,
          @dismiss="followers.splice(index, 1)",
          :width="width",
          :label-format="labelFormat",
          :line-width="3",
          :timebus-name="followers[index].name",
          :persist="false")

  video-controls(:color-by-options="meta", :with-toggles="true")
    template(#widget)
      v-btn(color="primary", small,
          @click="$emit('update:fileListVisible', !fileListVisible)") File List
        v-icon.pl-2(v-if="!fileListVisible") format_list_bulleted
        v-icon.pl-2(v-else) close

  v-card.my-2(v-show="fileListVisible")
    slot(name="filelist", @close="this.$emit('update:fileListVisible', false)")

  two-column(:width="containerWidth")
    template(#main="{ width }")
      tdm-temporal.no-transition(
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
                @click="scrubToEvent")
          v-tab-item(key="tracks", :style="{ height: widgetHeight }")
            tdm-table(
                v-bind="{ meta }",
                @click="scrubToEvent")
</template>

