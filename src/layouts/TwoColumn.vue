<template lang="pug">
.track-app
  v-container(fluid)
    v-layout(row, wrap, justify-center, ref="container")
      v-flex.mb-2
        v-layout.mb-2(column, align-center)
          v-flex(shrink, :style="{ 'width': width + 'px'}")
            slot(name="title")
            video-region(
                ref="region",
                :width="width",
                :label-format="labelFormat",
                :line-width="3",
                :loading="loading || loadingInternal",
                @init="$emit('init')")
            video-controls(
                @skip="$refs.region.skip($event)",
                :color-by-options="meta")
            slot(name="subvideowidget")
      v-flex(:style="{ 'width': twoColumn ? sidebarWidth + 'px' : null }")
        v-card.mb-2
          tdm-table(:meta="meta", @click="handleTrackSelect")
        slot(name="widget")
</template>

<script>
import VideoRegion from '../components/VideoRegion.vue';
import VideoControls from '../components/VideoControls.vue';
import TdmTable from '../components/TdmTable.vue';
import TdmTemporal from '../components/TdmTemporal.vue';
import { getParams } from '../utils';
import { mapState, mapMutations } from 'vuex';

export default {
  components: {
    TdmTable,
    VideoControls,
    VideoRegion,
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
  },
  data() {
    return {
      width: 0,
      loadingInternal: false,
      twoColumn: true,
      sidebarWidth: 600,
    };
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.resize);
  },
  mounted() {
    this.resize();
    window.addEventListener('resize', this.resize);
    /* Get parameters from query string */
    const params = getParams(window.location.hash.substring(1));
    if ('colorBy' in params) {
      this.colorByMeta({ key: params.colorBy });
    }
    if ('select' in params) {
      this.setPreselect({ preselect: params.select });
    }
  },
  methods: {
    ...mapMutations([
      'colorByMeta',
      'setPreselect',
    ]),
    handleTrackSelect(track) {
      // Hack to force activeTime to a different unique value.
      // const newtime = (track.begin / this.framerate) + Math.random() / 100;
      // this;
      console.log(track);
    },
    resize() {
      // TODO: something better than this.
      const minWidth = 900;
      const tw = this.sidebarWidth;
      const cw = this.$refs.container.clientWidth;
      if (tw + minWidth < cw) {
        this.width = cw - tw - 30;
        this.twoColumn = true;
      } else {
        this.width = cw;
        this.twoColumn = false;
      }
    },
  },
};
</script>
