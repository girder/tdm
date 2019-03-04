<template lang="pug">
v-data-table.small-table(:items="tracks", :headers="headers", :rows-per-page-items="rowsPerPage")
  template(slot="items", slot-scope="props")
    tr(v-if="props.item.state === STATES.ACTIVE", @click="$emit('click', props.item)")
      td(v-for="m, v in meta", :key="m") {{ props.item.meta[v] }}
      td [{{ props.item.begin }}, {{ props.item.end}}]
      td
        v-icon(:style="{ color: props.item.color }") brightness_1
</template>

<script>
import { mapState } from 'vuex';
import { STATES } from '../utils/tdm';

export default {
  props: {
    meta: {
      type: Object,
      default: () => {},
    },
  },
  data() {
    return {
      STATES,
      rowsPerPage: [15, 25],
      headers: [].concat(
        ...Object.keys(this.meta).map(m => ({
          text: this.meta[m],
          value: `meta.${m}`,
          width: '1%',
        })),
        ...[{
          text: 'Range',
          value: 'begin',
        },
        {
          text: 'Color',
          value: 'color',
          width: '1%',
        }],
      ),
    };
  },
  computed: mapState({
    tracks: state => state.tracks.filter(t => t.state === STATES.ACTIVE),
  }),
};
</script>

<style lang="stylus">
.small-table {
  th, td {
    padding: 0 12px !important;
  }
}
</style>
