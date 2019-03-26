<template lang="pug">
div
  p.title Features:
  ul.pb-3
    li click-and-drag to zoom
    li click elsewhere on the video to dismiss
    li click a row in the track table to scrub to that time
    li toggle annotation labels with the switch
    li change color scheme with the dropdown
    li upload your own KPF YML files
  v-layout.pb-3(column)
    label Activities:
    input(type="file", accept=".yml", ref="activities")
    label.mt-2 Geometry:
    input(type="file", accept=".yml", ref="geometry")
    label.mt-2 Types:
    input(type="file", accept=".yml", ref="types")
  v-btn.ma-0(@click="process", width="80px", color="primary") Process KPF
</template>

<script>
import KPF from '../utils/divakpf.js';

export default {
  methods: {
    async process() {
      await new Promise(resolve => window.setTimeout(resolve, 100));
      const activityFiles = this.$refs.activities.files;
      const geometryFiles = this.$refs.geometry.files;
      const typeFiles = this.$refs.types.files;
      if (activityFiles.length && geometryFiles.length) {
        const annotations = await KPF.fromFiles(activityFiles[0], geometryFiles[0], typeFiles[0]);
        this.$emit('loaded', annotations.getTDM({
          origin: 'Import',
        }, 'itrack'));
      }
    },
  },
};
</script>

<style>
</style>
