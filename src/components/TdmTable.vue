<template lang="pug">
v-data-table.small-table(
    :items="tracks",
    :headers="headers",
    :rows-per-page-items="rowsPerPage")
  template(slot="items", slot-scope="props")
    tr(v-if="props.item.state === STATES.ACTIVE", @click="$emit('click', props.item)")
      td
        v-icon(small, :color="props.item.color") brightness_1
      td(v-for="m, v in meta", :key="m") {{ props.item.meta[v] }}
      td [{{ props.item.begin }}, {{ props.item.end}}]
</template>

<script>
import { createNamespacedHelpers } from 'vuex'
const { mapState } = createNamespacedHelpers('tdm')
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
        {
          text: 'Color',
          value: 'color',
          width: '1%',
        },
        ...Object.keys(this.meta).map(m => ({
          text: this.meta[m],
          value: `meta.${m}`,
          width: '1%',
        })),
        ...[{
          text: 'Range',
          value: 'begin',
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
  display: flex;
  flex-direction: column;
  height: 100%;

  .v-table__overflow {
    flex-grow: 1;
    background-color: white;
    overflow: auto;
  }

  .v-table {
    th, td {
      padding: 0 10px !important;
      height: 40px;
    }

    tr {
      height: 40px;
    }

    .v-datatable__actions__select {
      width: 170px;
      margin: 0;
    }
    .v-datatable__actions__pagination {
      margin: 10px;
    }
  }
}
</style>
