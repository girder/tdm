<template lang="pug">
v-layout.grow(row)
  .grow
    slot(name="main", :width="width - widgetWidth - 8")
  div.resize.grow(@mousedown="down")
  .shrink(:style="{ width: `${widgetWidth}px` }")
    slot(name="widget", :width="widgetWidth")
</template>

<script>
export default {
  props: {
    width: {
      type: Number,
      required: true,
    },
  },

  data() {
    return {
      widgetWidth: 350,
      minWidgetWidth: 100,
      downloc: null,
      drag: false,
    };
  },

  methods: {

    down(evt) {
      this.downloc = evt.screenX;
      this.drag = true;

      window.addEventListener('mousemove', this.move, { passive: true });
      window.addEventListener('mouseup', this.up, { passive: true });
    },

    move(evt) {
      const delta = (this.downloc - evt.screenX);
      const maxWidgetWidth = this.width - 400;
      if (this.widgetWidth + delta > this.minWidgetWidth
        && this.widgetWidth + delta < maxWidgetWidth) {
        this.widgetWidth += delta;
        this.downloc = evt.screenX;
      }
    },

    up(evt) {
      window.removeEventListener('mousemove', this.move, { passive: true });
      window.removeEventListener('mouseup', this.up, { passive: true });
    },
  },

  beforeDestroy() {
    window.removeEventListener('mouseup', this.up, { passive: true });
  },
  
  mounted() {
    window.addEventListener('mouseup', this.up, { passive: true });
  },

};
</script>

<style>
.resize {
  background: lightgray;
  width: 8px;
  cursor: col-resize;
}
</style>
