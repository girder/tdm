<script>
import { mapState, mapMutations } from 'vuex';
import { scaleBox } from '../utils/tdm';
import { STATES, SHAPES, centroid } from '../utils/tdm';
import { DISABLED_COLOR } from '../constants';
import { debounce } from '../utils';
import TimeBus from '../utils/timebus';

export default {
  props: {
    width: {
      /* Width of the canvas in pixels */
      type: Number,
      required: true,
    },
    zoom: {
      /*
       * Range: [0, 100]
       * 0 === no zoom
       */
      type: Number,
      default: 0,
    },
    labelFormat: {
      type: Array,
      default: () => ['label'],
    },
    defaultColor: {
      type: String,
      default: 'yellow',
    },
    pipsize: {
      /* A number in (0, 1] of the width */
      type: Number,
      default: 0.4,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    lineWidth: {
      type: Number,
      default: 4,
    },
  },
  data() {
    return {
      ctx: null,
      pipctx: null,
      staticctx: null,
      pipstaticctx: null,
      mouse: {},
      video: null,
      animationId: null,
      debouncedRedraw: () => {},
      debounceTime: () => {},
    };
  },
  computed: {
    ...mapState([
      'url', 'framerate', 'duration', 'offset',
      'playbackRate', 'labels', 'shapes', 'playing', 'tracks',
    ]),
    ...mapState({
      videoWidth: 'width',
      videoHeight: 'height',
    }),
  },
  watch: {
    playbackRate(newval) {
      this.$refs.video.playbackRate = newval;
    },
    tracks() {
      this.updateActive(this.$refs.video.currentTime * this.framerate);
      if (this.staticctx) {
        this.updateStatic();
      }
    },
    width() {
      if (this.ctx && this.pipctx && this.staticctx && this.pipstaticctx) {
        this.setupCanvas(this.ctx);
        this.setupCanvas(this.staticctx);
        this.setupPip(this.pipctx);
        this.setupPip(this.pipstaticctx);
        this.updateStatic();
        this.resetMouse();
        if (!this.url) {
          this.drawInfo(this.ctx, 'Source Unavailable');
        }
      }
    },
    playing(playing) {
      const v = this.$refs.video;
      if (playing) {
        v.play();
      } else {
        v.pause();
      }
    },
    shapes(newval) {
      this.updateStatic();
    },
    url(newval) {
      this.$refs.video.load();
    },
  },
  beforeDestroy() {
    window.removeEventListener('mouseup', this.mouseup, false);
    TimeBus.$off('active', this.updateTime);
  },
  mounted() {
    this.stills = [];
    this.ctx = this.$refs.canvas.getContext('2d');
    this.pipctx = this.$refs.pipcanvas.getContext('2d');
    this.staticctx = this.$refs.staticcanvas.getContext('2d');
    this.pipstaticctx = this.$refs.pipstatic.getContext('2d');
    this.debouncedRedraw = debounce(() => {
      this.clearCanvas(this.pipstaticctx);
      this.drawPiP(this.pipstaticctx, this.tracks, this.drawStatic);
    }, 100);
    const func = () => TimeBus.$emit('passive', this.$refs.video.currentTime);
    this.debounceTime = debounce(func, 8000, false, 1);
    TimeBus.$on('active', this.updateTime);
    this.video = this.$refs.video;
    // The following may be Zero-width if parent has not yet computed the width.
    this.setupCanvas(this.ctx);
    this.setupCanvas(this.staticctx);
    this.setupPip(this.pipctx);
    this.setupPip(this.pipstaticctx);
    this.resetMouse();
    this.$refs.canvas.addEventListener('mousedown', this.mousedown, false);
    window.addEventListener('mouseup', this.mouseup, false);
    this.$refs.canvas.addEventListener('mousemove', this.mousemove, false);
    this.$refs.canvas.addEventListener('mousewheel', this.scrollmove);
    this.updateStatic();
    this.drawInfo(this.ctx, 'Source Unavailable.');
  },
  methods: {
    ...mapMutations(['setPlaying']),
    updateTime(time) {
      this.$refs.video.currentTime = time;
      this.updateActive(time * this.framerate);
    },

    /**
     * Update the current list of on screen frames,
     * either because time has changed or because the available tracks have changed.
     * @param {Number} frametime
     */
    updateActive(frametime) {
      const activeKeyFrames = this.$store.getters.activeKeyFrames(frametime);
      const activeInterpolated = this.$store.getters.activeContinuousFrames(frametime);
      this.stills = activeInterpolated.concat(activeKeyFrames);
    },

    /**
     * If frames, width, etc. changes, redraw the static canvas.
     */
    updateStatic() {
      this.clearCanvas(this.staticctx);
      this.drawStatic(this.staticctx, this.tracks, 0, 0, this.videoWidth);
      this.debouncedRedraw();
    },

    loop() {
      const $video = this.video;
      const offset = this.offset;
      const duration = this.duration;
      const frametime = $video.currentTime * this.framerate;
      const frameoffset = offset * this.framerate;
      if (frametime < frameoffset) {
        $video.currentTime = offset;
      }
      if (!$video.paused && !$video.ended) {
        this.debounceTime();
        this.updateActive(frametime);
      } else if ($video.ended || ($video.currentTime > (offset + duration))) {
        this.setPlaying({ playing: false });
        TimeBus.$emit('active', offset);
      }
      this.clearCanvas(this.ctx);
      this.clearCanvas(this.pipctx);
      if (this.loading) {
        this.drawInfo(this.ctx, 'LOADING...');
      } else {
        this.drawStills(this.ctx, this.stills, 0, 0, this.videoWidth);
        this.drawStamp(frametime);
        this.drawMouse();
        this.drawPiP(this.pipctx, this.stills, this.drawPiPDynamic);
      }
      window.requestAnimationFrame(this.loop);
    },

    /* DRAW methods and canvas operations */

    setupCanvas(context) {
      const ctx = context;
      const scale = this.width / this.videoWidth;
      const canvasHeight = scale * this.videoHeight;
      ctx.canvas.width = this.width;
      ctx.canvas.height = canvasHeight;
    },

    setupPip(context) {
      const ctx = context;
      const cvs = ctx.canvas;
      ctx.canvas.width = this.width * this.pipsize;
      ctx.canvas.height = this.width * this.pipsize;
      cvs.style.paddingTop = 150;
      cvs.style.paddingLeft = 20;
    },

    clearCanvas(ctx) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    },

    /**
     * drawLoading just draws a loading canvas
     */
    drawInfo(context, text) {
      const ctx = context;
      ctx.fillStyle = 'black';
      ctx.globalAlpha = 0.8;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = 'white';
      ctx.font = '50px mono';
      const tw = ctx.measureText(text).width;
      ctx.fillText(text, (ctx.canvas.width / 2) - (tw / 2), (ctx.canvas.height / 2) - 25);
    },

    /**
     * takes x, y in screen coordinates.
     */
    drawDot(context, x, y, radius, color, enabled) {
      const ctx = context;
      let activityColor;
      if (enabled) {
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        activityColor = color;
      } else {
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.2;
        activityColor = DISABLED_COLOR;
        radius = 1;
      }
      ctx.strokeStyle = activityColor;
      ctx.fillStyle = activityColor;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fill();
      ctx.globalAlpha = 1.0;
    },

    /**
     * takes a, b, in screen coordinates
     */
    drawLine(context, a, b, width, color, enabled) {
      const ctx = context;
      let activityColor;
      if (enabled) {
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        activityColor = color;
      } else {
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.2;
        activityColor = DISABLED_COLOR;
      }
      ctx.strokeStyle = activityColor;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    },

    /**
     * takes x, y, width in real coords
     * draws them into given canvas
     */
    drawStatic(context, tracks, x, y, width) {
      if (!this.shapes) {
        return;
      }
      const ctx = context;
      const scale = ctx.canvas.width / width;
      tracks.forEach((t) => {
        if (t.state !== STATES.HIDDEN && t.shapes) {
          t.shapes.forEach((s, i) => {
            const scalex = scale * x;
            const scaley = scale * y;
            switch (s.type) {
              case SHAPES.POINT:
                const p = scaleBox(s.data.point, scale);
                this.drawDot(
                  ctx,
                  p[0] - scalex,
                  p[1] - scaley,
                  s.data.radius, t.color, t.state === STATES.ACTIVE,
                );
                break;
              case SHAPES.LINE:
                const a = scaleBox(s.data.a, scale);
                const b = scaleBox(s.data.b, scale);
                this.drawLine(
                  ctx,
                  [a[0] - scalex, a[1] - scaley],
                  [b[0] - scalex, b[1] - scaley],
                  s.data.width, t.color, t.state === STATES.ACTIVE,
                );
                break;
            }
          });
        }
      });
    },

    /**
     * takes x, y, width in real video coordinates
     * and draws them into the given canvas.
     */
    drawStills(context, boxes, x, y, width) {
      const ctx = context;
      const scale = ctx.canvas.width / width;
      boxes.forEach((box) => {
        if (box.box && box.track.state !== STATES.HIDDEN) {
          const b = scaleBox(box.box, scale);
          ctx.beginPath();
          ctx.lineWidth = (box.track.state === STATES.ACTIVE)
            ? this.lineWidth
            : 1;
          const activityColor = (box.track.state === STATES.ACTIVE)
            ? box.track.color || this.defaultColor
            : DISABLED_COLOR;
          ctx.strokeStyle = activityColor;
          ctx.fillStyle = activityColor;
          const scalex = scale * x;
          const scaley = scale * y;
          ctx.rect(b[0] - scalex, b[1] - scaley, b[2] - b[0], b[3] - b[1]);
          ctx.stroke();
          if (this.shapes) {
            const c = centroid(b);
            this.drawDot(ctx, c[0] - scalex, c[1] - scaley, 3, box.track.color, box.track.state === STATES.ACTIVE);
          }
          if (this.labels && box.track.state === STATES.ACTIVE) {
            const values = this.labelFormat.map(l => box.track.meta[l]);
            const text = values.join(':');
            ctx.font = '14px mono';
            const textWidth = ctx.measureText(text).width;
            ctx.fillRect(b[0] - 2 - scalex, b[1] - 12 - scaley, textWidth + 4, 14);
            ctx.fillStyle = 'black';
            ctx.fillText(text, b[0] - scalex, b[1] - scaley);
          }
        }
      });
    },

    drawStamp(frame) {
      const ctx = this.ctx;
      ctx.fillStyle = 'black';
      ctx.font = '14px mono';
      const frameText = `FRAME ${Math.floor(frame).toString()}`;
      const frameTextWidth = ctx.measureText(frameText).width;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(0, 0, frameTextWidth + 8, 24);
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = 'white';
      ctx.fillText(frameText, 4, 18);
    },

    /**
     * Called every frame
     */
    drawPiPDynamic(context, stills, realX, realY, realWidth) {
      const ctx = context;
      const canvas = ctx.canvas;
      const pipWidth = this.pipsize * this.width;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        this.$refs.video,
        realX, realY, realWidth, realWidth,
        0, 0, ctx.canvas.width, ctx.canvas.height,
      );
      ctx.beginPath();
      ctx.lineWidth = '10';
      ctx.strokeStyle = 'white';
      ctx.rect(0, 0, pipWidth, pipWidth);
      ctx.stroke();
      this.drawStills(ctx, this.stills, realX, realY, realWidth);
    },

    drawPiP(context, drawables, drawfn) {
      const ctx = context;
      const canvas = ctx.canvas;
      if (this.mouse.width) {
        const width = this.mouse.width;
        const mainScale = this.width / this.videoWidth;
        const realWidth = width / mainScale;
        const realX = this.mouse.x / mainScale;
        const realY = this.mouse.y / mainScale;
        if (((realX + realWidth) / this.videoWidth) > 0.5) {
          canvas.style.left = '20px';
          canvas.style.right = 'initial';
        } else {
          canvas.style.right = '20px';
          canvas.style.left = 'initial';
        }
        drawfn(ctx, drawables, realX, realY, realWidth);
        canvas.style.zIndex = 101;
      } else {
        canvas.style.zIndex = -1;
      }
    },

    drawMouse() {
      this.ctx.globalAlpha = 0.3;
      this.ctx.fillStyle = 'yellow';
      this.ctx.fillRect(
        this.mouse.x,
        this.mouse.y,
        this.mouse.width,
        this.mouse.height,
      );
      this.ctx.globalAlpha = 1.0;
    },

    /* UI CONTROL methods */

    canPlay() {
      if (this.playing) {
        this.$refs.video.play();
      }
      if (!this.animationId) {
        this.animationId = window.requestAnimationFrame(this.loop);
      }
      this.$emit('init');
    },

    /* Mouse PiP selector */

    resetMouse() {
      this.mouse = {
        x: 0, y: 0, width: 0, height: 0, drag: false,
      };
      this.debouncedRedraw();
    },
    mousedown(e) {
      this.resetMouse();
      this.mouse.x = e.layerX;
      this.mouse.oldx = e.layerX;
      this.mouse.y = e.layerY;
      this.mouse.oldy = e.layerY;
      this.mouse.drag = true;
    },
    mouseup() {
      this.mouse.drag = false;
    },
    mousemove(e) {
      if (this.mouse.drag) {
        this.mouse.width = e.layerX - this.mouse.oldx;
        this.mouse.height = this.mouse.width;
        this.debouncedRedraw();
      }
    },
  },
};
</script>

<template lang="pug">
.video-region
  v-layout.relative(column, align-center)
    canvas.static-canvas(ref="staticcanvas")
    canvas.canvas(ref="canvas")
    canvas.pip-canvas(ref="pipcanvas")
    canvas.pip-static-canvas(ref="pipstatic")
    video(
        ref="video",
        muted,
        :width="width",
        :height="(width / videoWidth) * videoHeight",
        @canplay="canPlay")
      source(:src="url",
          @error="$emit('error', $event)")
      h1 Could not load video.
</template>

<style lang="stylus" scoped>
.relative {
  position: relative;
}

.pip-canvas, .pip-static-canvas {
  bottom: 20px;
}

canvas {
  position: absolute;
  z-index: 5;
}
</style>
