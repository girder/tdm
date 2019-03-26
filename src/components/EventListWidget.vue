<script>
import { createNamespacedHelpers } from 'vuex'
const { mapState } = createNamespacedHelpers('tdm')
export default {
  props: {
    actionIcon: {
      type: String,
      default: 'pin_drop',
    },
    events: {
      type: Object,
      required: true,
    },
  },

  computed: {
    ...mapState([
      'statemap',
      'colormap',
      'colorBy'
    ]),
    rows() {
      /** flatten the heirarchal map of events */
      const { events } = this;
      if (events) {
        const groupByKeys = Object.keys(events);
        return [].concat(...groupByKeys.map(groupByKey => {
          const groupEvents = events[groupByKey];
          return [].concat(...groupEvents.map(trackEvents => 
            [].concat(...trackEvents.map(te => ({ ...te, groupByKey }))),
          ));
        }));
      } else {
        return [];
      }
    },
  },
};
</script>

<template lang="pug">
.event-list
  .content-wrapper
    .overflow-container
      v-list
        template(
            v-for="item, i in rows",
            v-if="statemap[item.meta[colorBy]] === 'active'",)
          v-list-tile(
              :key="`${i}tile`",
              @click="$emit('click', item)")
            v-list-tile-title
              v-layout(row)
                v-icon.pr-2(small,
                    :color="colormap[item.meta[colorBy]]",
                    :style="{verticalAlign: 'text-top' }") brightness_1
                | {{ item.begin }} - {{ item.end }} ({{ item.end - item.begin}}s)
                v-spacer
                v-btn.pa-0.ma-0(icon, small, @click.stop="$emit('action', item)")
                  v-icon(small) {{ actionIcon }}
          v-divider(:key="`${i}divider`", v-if="i < (rows.length - 1)")
</template>

<style lang="scss">
.event-list {
  display: flex;
  flex-direction: column;
  transition: none;
  width: 100%;
  height: 100%;

  .content-wrapper {
    display: flex;
    flex: 1;
    min-height: 0px;
  }

  .overflow-container {
    flex: 1;
    overflow: auto;
  }

  .v-list__tile {
    height: 34px;
    font-size: 14px;
    .v-btn--small {
      height: 24px;
      width: 24px;
    }
  }
}
</style>
