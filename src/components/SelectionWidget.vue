<template lang="pug">
v-layout(column, justify-space-between, align-content-space-around)
  v-layout(row)
    v-checkbox.ma-0.pa-0(hide-details,
        :input-value="allchecked"
        color="secondary",
        @change="toggle")
  v-flex(v-for="(v, k, i) in events", :key="k")
    v-layout(row)
      v-checkbox.ma-0.pa-0(
          hide-details,
          :input-value="statemap[k] === STATES.ACTIVE",
          :color="colormap[k]",
          @change="updateState(k, statemap[k])")
      v-btn.ma-0.pa-0.add-cursor(
          absolute, right, small, icon,
          @click="$emit('dropcursors', k)")
        v-icon {{ $vuetify.icons.timeline }}
</template>

<script>
import { createNamespacedHelpers } from 'vuex'
const { mapState, mapActions } = createNamespacedHelpers('tdm')
import { STATES } from '../utils/tdm';

export default {
  props: {
    events: {
      type: Object,
      required: true,
    }
  },
  data() {
    return {
      checked: [],
      allchecked: true,
      STATES,
    };
  },
  computed: mapState({
    statemap: 'statemap',
    colormap: 'colormap',
  }),
  methods: {
    ...mapActions(['resetState', 'toggleByMeta']),
    toggle() {
      if (this.allchecked) {
        this.resetState({ newstate: STATES.DISABLED });
      } else {
        this.resetState({ newstate: STATES.ACTIVE });
      }
      this.allchecked = !this.allchecked;
    },
    updateState(value, currentState) {
      const newState = currentState === STATES.DISABLED
        ? STATES.ACTIVE
        : STATES.DISABLED;
      const sm = this.toggleByMeta({ value, newState });
    },
  },
};
</script>

<style lang="scss">
.add-cursor {
  z-index: 5;
  .v-icon {
    font-size: 18px;
  }
}
</style>
