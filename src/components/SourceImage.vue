<script>
export default {
  props: {
    src: {
      type: String,
      required: true,
    },
    width: {
      type: Number,
      required: true
    },
    height: {
      type: Number,
      required: true
    },
    update: {
      type: Function,
      required: true,
    },
    crossorigin: {
      type: Boolean,
      default: false,
    },
  },

  watch: {
    src(newval){
      this.loadImage(newval);
    },
  },

  mounted() {
    if (this.src) {
      this.loadImage(this.src)
    }
  },

  methods: {
    loadImage(src) {
      var newImg = new Image();
      newImg.onload = () => {
        const { width, height } = newImg;
        this.$emit('init', { width, height, duration: 1 / this.framerate });
      }
      newImg.src = src;
      this.$refs.image.src = src;
      this.update(0);
    },
  },
}
</script>

<template lang="pug">
img(v-if="src", ref="image", :crossorigin="crossorigin",
          :width="width",
          :height="height")
</template>

<style scoped>
img { 
  image-rendering: optimizeSpeed;             /* STOP SMOOTHING, GIVE ME SPEED  */
  image-rendering: -moz-crisp-edges;          /* Firefox                        */
  image-rendering: -o-crisp-edges;            /* Opera                          */
  image-rendering: -webkit-optimize-contrast; /* Chrome (and eventually Safari) */
  image-rendering: pixelated; /* Chrome */
  image-rendering: optimize-contrast;         /* CSS3 Proposed                  */
  -ms-interpolation-mode: nearest-neighbor;   /* IE8+                           */
}
</style>
