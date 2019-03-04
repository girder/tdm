<template lang="pug">
v-layout(column)
  v-checkbox.ma-0.pa-0(hide-details,
      :input-value="allchecked"
      color="secondary",
      @change="toggle")
  v-flex(v-for="(v, k) in statemap", :key="k")
    v-checkbox.ma-0.pa-0(
        hide-details,
        :input-value="v === STATES.ACTIVE",
        :color="colormap[k]",
        @change="updateState(k, v)")
</template>

<script>
import { mapState, mapMutations } from 'vuex';
import { STATES } from '../utils/tdm';

export default {
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
    ...mapMutations(['resetState', 'toggleByMeta']),
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
