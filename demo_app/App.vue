<template lang="pug">
v-app.annotation-view(dark)
  v-flex(row, shrink)
    v-alert(:value="loading", type="warning") Loading...
    v-alert(:value="err", type="error") {{ err }}
  tdm-app(
      :autoplay="false",
      :loading="loading",
      :label-format="labelFormat",
      :meta="meta")
    v-card(dark, slot="subvideowidget", tile)
      tdm-temporal.mx-2(:threshold.sync="threshold")
    v-card.my-2.pa-3(slot="widget")
      h3.headline Choose a VIRAT Clip:
      v-autocomplete(v-model="autocomplete", :items="allVideos", label="Choose a VIRAT clip")
      diva-kpf-widget(@loaded="addTracks({ tracks: $event, key: colorBy})")
</template>

<script>
import axios from 'axios';
import { mapState, mapMutations, mapActions } from 'vuex';

import KPF from '@/utils/divakpf.js';
import { DivaKpfWidget, SelectionWidget, TdmTemporal } from '@/components';
import TdmApp from '@/layouts/TwoColumn';

export default {
  components: {
    TdmApp,
    TdmTemporal,
    DivaKpfWidget,
    SelectionWidget,
  },
  data() {
    return {
      loading: false,
      initialColorBy: 'name',
      labelFormat: ['name', 'actor_id'],
      autocomplete: null,
      err: '',
      threshold: 0.8,
      meta: {
        name: 'Activity Type',
        type: 'Actor Type',
        actor_id: 'Actor Id',
        origin: 'Origin',
      },
    };
  },
  computed: {
    ...mapState(['colorBy']),
    allVideos() {
      return this.manifest ? this.manifest.videos : [];
    },
    video() {
      if (this.autocomplete) {
        const vid = this.manifest.meta[this.autocomplete];
        return vid;
      }
      return {};
    },
  },
  watch: {
    async video(newVal) {
      const vid = newVal;
      this.setUrl({ url: vid.uri });
      this.setWidth({ width: parseInt(this.video.width || 1920, 10) });
      this.setHeight({ height: parseInt(this.video.height || 1080, 10) });
      this.setFramerate({
        framerate: parseFloat(this.video.framerate || 30.0),
      });
      this.setDuration({
        duration: parseFloat(this.video.duration || 300.0),
      });
      if ('annotations' in newVal) {
        const { annotations } = newVal;
        this.err = '';
        try {
          this.loading = true;
          const { data: activities } = await axios.get(annotations.activities);
          const { data: geom } = await axios.get(annotations.geom);
          const { data: type } = await axios.get(annotations.types);
          const kpf = KPF.fromText(activities, geom, type);
          const tdms = kpf.getTDM({ origin: 'S3' });
          this.setTracks({ tracks: tdms, key: this.initialColorBy });
          this.loading = false;
        } catch (err) {
          this.err = err.message;
          this.loading = false;
        }
      }
    },
  },
  methods: {
    ...mapMutations([
      'setUrl',
      'setWidth',
      'setHeight',
      'setDuration',
      'setFramerate',
      'setColorBy',
      'bucketSort',
      'colorByMeta',
    ]),
    ...mapActions(['addTracks', 'setTracks']),
  },
  asyncComputed: {
    async manifest() {
      const { data } = await axios.get(manifestURI);
      return data;
    },
  },
};
</script>
