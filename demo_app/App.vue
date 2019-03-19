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
      h3.headline Upload your own KPF
      diva-kpf-widget(@loaded="addTracks({ tracks: $event, key: colorBy})")
</template>

<script>
import axios from 'axios';
import { mapState, mapMutations, mapActions } from 'vuex';

import KPF from '@/utils/divakpf.js';
import { generateDetectionLines } from '@/utils/tdm.js';
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
      video: {
        url: `https://s3.amazonaws.com/diva-mturk-ingestion-prod/uuid-encoded/2018-12-12/00-05-00_00-10-00/G999_pilotsample/9c51f770-25c2-41bb-b244-cfea25bae3cd.mp4`,
        width: 1920,
        height: 1080,
        framerate: 30,
        duration: 238.53,
        annotations: {
          activities: `${process.env.BASE_URL}data/activities.yml`,
          geom: `${process.env.BASE_URL}data/geom.yml`,
          types: `${process.env.BASE_URL}data/types.yml`,
        },
      }
    };
  },
  computed: mapState(['colorBy']),
  async mounted() {
    this.setUrl({ url: this.video.url });
    this.setWidth({ width: parseInt(this.video.width || 1920, 10) });
    this.setHeight({ height: parseInt(this.video.height || 1080, 10) });
    this.setFramerate({
      framerate: parseFloat(this.video.framerate || 30.0),
    });
    this.setDuration({
      duration: parseFloat(this.video.duration || 300.0),
    });
    if ('annotations' in this.video) {
      const { annotations } = this.video;
      this.err = '';
      try {
        this.loading = true;
        const { data: activities } = await axios.get(annotations.activities);
        const { data: geom } = await axios.get(annotations.geom);
        const { data: type } = await axios.get(annotations.types);
        const kpf = KPF.fromText(activities, geom, type);
        const tdms = kpf.getTDM({ origin: 'S3' });
        tdms.forEach(track => track.shapes = generateDetectionLines(track.detections));
        this.setTracks({ tracks: tdms, key: this.initialColorBy });
        this.loading = false;
      } catch (err) {
        this.err = err.message;
        this.loading = false;
      }
    }
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
};
</script>
