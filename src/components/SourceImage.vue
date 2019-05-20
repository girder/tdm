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
      // this.update();
    },
  },
}
</script>

<template lang="pug">
img(v-if="src", ref="image",
          :width="width",
          :height="height")
</template>
