<script>
export default {
  props: {
    width: {
      type: Number,
      required: true,
    },
    aspect: {
      type: Number,
      required: true,
    },
    childCount: {
      type: Number,
      required: true,
    },
    buffer: {
      type: Number,
      default: 5,
    }
  },
  data() {
    return {
      mainWidth: 0,
      childWidth: 0,
      childHeight: 0,
    }
  },
  methods: {
    recompute() {
      const width = this.width - this.buffer;
      if (this.childCount && this.aspect) {
        this.childHeight = 
            (width / (this.childCount* this.aspect))
          / (1 + (1 / this.childCount));
        this.childWidth = this.childHeight * this.aspect;
        this.mainWidth = width - this.childWidth;
      } else {
        this.mainWidth = this.width;
      }
    },
  },
  watch: {
    width() {
      this.recompute();
    },
    aspect() {
      this.recompute();
    },
    childCount() {
      this.recompute();
    },
  },
  mounted() { this.recompute(); },
}
</script>

<template lang="pug">
v-layout(row, justify-space-between)
  slot(name="main", :width="mainWidth")
  v-layout(column, shrink)
    v-flex(v-for="(_, index) in childCount", :key="`child${index}`")
      slot(name="child", :width="childWidth", :index="index")
</template>
