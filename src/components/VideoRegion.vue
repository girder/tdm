<script>
import panzoom from 'panzoom';
import { createNamespacedHelpers } from 'vuex'
import { scaleBox } from '../utils/tdm';
import { STATES, SHAPES, centroid } from '../utils/tdm';
import { MODES } from '../constants';
import { debounce, valBetween, convert2d } from '../utils';
import TimeBus from '../utils/timebus';
import { cpus } from 'os';

const { mapState } = createNamespacedHelpers('tdm')

// Shape Cache
let frametime = 0;
let current_shapes = [];
let static_shapes = [];
let follow_shape = null;

const MAX_ZOOM = 5;
const MIN_ZOOM = 1;

const CANVAS_SCALAR = 2;

export default {
  props: {
    containerWidth: {
      /* Width of the canvas in pixels */
      type: Number,
      required: true
    },
    containerHeight: {
      type: Number,
      required: true
    },
    defaultColor: {
      type: String,
      default: 'yellow'
    },
    loading: {
      type: Boolean,
      default: false
    },
    timebusName: {
      type: String,
      default: 'master'
    },
    dismissable: {
      type: Boolean,
      default: false
    },
    getShapes: {
      type: Function,
      default: async (frametime, last_frametime) => ({
        // if past !== null, overwrite history
        all: null,
        append: [],
        current: [],
        follow: null,
      })
    },
    handleEvent: {
      type: Function,
      default: async (frametime, event_type, event) => ({
        all: null,
        append: [],
        current: [],
        follow: null,
      })
    },
    mode: {
      type: Number,
      default: MODES.HANDLE
    },
    crossorigin: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      ctx: null,
      staticctx: null,
      pzinstance: null,
      mouse: {
        down_x: 0,
        down_y: 0,
        last_x: 0,
        last_y: 0
      },
      video: null,
      animationId: null,
      debounceTime: () => {},
      debounceLoop: () => {},
    };
  },
  computed: {
    ...mapState([
      'url',
      'framerate',
      'duration',
      'offset',
      'playbackRate',
      'playing'
    ]),
    ...mapState({
      videoWidth: 'width',
      videoHeight: 'height'
    }),

    dimensions() {
      const {
        containerWidth,
        containerHeight,
        videoWidth,
        videoHeight,
        zoom
      } = this;
      let originalWidth = containerWidth;
      let originalHeight = (containerWidth / videoWidth) * videoHeight;
      if (originalHeight > containerHeight) {
        // TODO: return width where height is limiting factor.
      }
      const width = originalWidth;
      const height = originalHeight;
      const scale = videoWidth / width;
      return { width, height, originalWidth, originalHeight, scale };
    }
  },

  watch: {
    playbackRate(newval) {
      this.$refs.video.playbackRate = newval;
    },
    dimensions() {
      const { ctx, staticctx, dimensions, url } = this;
      if (ctx && staticctx) {
        this.setupCanvas(ctx, dimensions.width * CANVAS_SCALAR, dimensions.height * CANVAS_SCALAR);
        this.setupCanvas(staticctx, dimensions.width * CANVAS_SCALAR, dimensions.height * CANVAS_SCALAR);
        this.resetStatic();
        if (!url) {
          this.drawInfo(ctx, 'Source Unavailable');
        } else {
          this.loop();
        }
      }
    },
    playing(playing) {
      const v = this.$refs.video;
      if (playing) {
        v.play();
        this.loopSetup();
      } else {
        v.pause();
      }
    },
    url(newval) {
      this.$refs.video.load();
    },
    loading() {
      this.debounceLoop();
    },
    mode(newval) {
      if (newval === MODES.DRAG) {
        this.pzinstance.pause();
      } else {
        this.pzinstance.resume();
      }
    }
  },

  beforeDestroy() {
    window.removeEventListener('mouseup', this.mouseup, false);
    TimeBus.$off(`${this.timebusName}:active`, this.updateTime);
    this.$refs.canvas.removeEventListener('click', this.click, false);
    this.$refs.canvas.removeEventListener('mousedown', this.mousedown, false);
    this.$refs.canvas.removeEventListener('mousemove', this.mousemove, false);
    this.pzinstance.dispose();
  },

  mounted() {
    // context for current (time = now) drawables that change often
    this.ctx = this.$refs.canvas.getContext('2d');
    // context for static (past) drawables that don't change much
    this.staticctx = this.$refs.staticcanvas.getContext('2d');
    this.video = this.$refs.video;
    
    const emitTime = () =>
      TimeBus.$emit(
        `${this.timebusName}:passive`,
        this.$refs.video.currentTime
      );
    this.debounceTime = debounce(emitTime, 80, false, 1);
    this.debounceLoop = debounce(this.loop, 100);
    TimeBus.$on(`${this.timebusName}:active`, this.updateTime);
    
    // The following may be Zero-width if parent has not yet computed the width.
    const { width, height } = this.dimensions;
    this.setupCanvas(this.ctx, width * CANVAS_SCALAR, height * CANVAS_SCALAR);
    this.setupCanvas(this.staticctx, width * CANVAS_SCALAR, height * CANVAS_SCALAR);
    // this.resetMouse();
    this.pzinstance = panzoom(this.$refs.videocontainer, {
      maxZoom: 6,
      minZoom: 1,
      smoothScroll: false
    });
    this.pzinstance.on('zoom', e => {
      const { x, y, scale } = e.getTransform();
    });
    if (this.mode === MODES.DRAG) {
      this.pzinstance.pause();
    }
    this.$refs.canvas.addEventListener('click', this.click, false);
    this.$refs.canvas.addEventListener('mousedown', this.mousedown, false);
    this.$refs.canvas.addEventListener('mousemove', this.mousemove, false);
    window.addEventListener('mouseup', this.mouseup, false);
    this.resetStatic();
    this.drawInfo(this.ctx, 'Source Unavailable');
  },
  methods: {
    updateTime(time) {
      this.$refs.video.currentTime = time;
      this.loop();
    },

    async _handleEvent(event_type, event) {
      const { video, framerate, videoWidth, videoHeight } = this;
      const { all, append, current, follow } = await this.handleEvent(
        frametime, event_type, event,
      );
      this.processShapes({
        all, append, current, follow,
        lastframe: frametime,
        frametime,
        x: 0, y: 0,
        width: videoWidth,
        height: videoHeight
      });
    },

    /**
     * If frames, width, etc. changes, redraw the static canvas.
     */
    resetStatic() {
      this.clearCanvas(this.staticctx);
      this.drawShapes({
        context: this.staticctx,
        shapeslist: static_shapes.slice(0, frametime),
        x: 0,
        y: 0,
        width: this.videoWidth,
        height: this.videoHeight
      });
    },

    /**
     * This function should be used to guarantee that loop is invoked
     * with prevent=false.
     */
    loopSetup() {
      if (this.animationId) {
        window.cancelAnimationFrame(this.animationId);
      }
      this.loop(0, false);
    },

    loop(delta, prevent = true) {
      const $video = this.video;
      const offset = this.offset;
      const duration = this.duration;
      const lastframe = frametime;
      const thisFrame = Math.round($video.currentTime * this.framerate);

      // TODO: this logic can probably be simplified.
      if ($video.currentTime < offset) {
        // $video.currentTime = offset;
        TimeBus.$emit(`${this.timebusName}:active`, offset + 0.001);
      } else if (
        !prevent &&
        $video.currentTime > offset + duration &&
        this.timebusName === 'master'
      ) {
        // reset clock to offset
        TimeBus.$emit(`${this.timebusName}:active`, offset + 0.001);
      } else if ((!$video.ended && thisFrame !== lastframe) || prevent) {
        frametime = thisFrame;
        // Only emit passive events to the master timebus
        if (this.timebusName === 'master') {
          this.debounceTime();
        }
        if (this.loading) {
          this.clearCanvas(this.ctx);
          this.drawInfo(this.ctx, 'LOADING...');
        } else {
          const { all, append, current, follow } = this.getShapes(frametime, lastframe);
          this.processShapes({
            all, append, current, follow, lastframe, frametime,
            x: 0, y: 0,
            width: this.videoWidth,
            height: this.videoHeight
          });
        }
      }
      
      if (this.playing && !prevent) {
        this.animationId = window.requestAnimationFrame(d =>
          this.loop(d, false)
        );
      }
    },

    processShapes({
      lastframe, frametime,
      x, y, width, height,
      all = null,
      append = [],
      current = null,
      follow = null,
    }) {
      
      this.clearCanvas(this.ctx);
      if (current) {
        current_shapes = current;
        this.drawShapes({
          context: this.ctx,
          shapeslist: current,
          x, y, width, height,
        });
      }
      this.drawStamp(this.ctx, frametime);

      if (follow) {
        this.follow(follow);
      }

      if (all) {
        static_shapes = all;
        this.clearCanvas(this.staticctx);
        this.drawShapes({
          context: this.staticctx,
          shapeslist: static_shapes.slice(0, frametime),
          x, y, width, height,
        });
      } else if (lastframe < frametime) {
        append.forEach((shapes, index) => {
          static_shapes[index] = shapes;
        });
        this.drawShapes({
          context: this.staticctx,
          shapeslist: static_shapes.slice(lastframe, frametime),
          x, y, width, height,
        });
      } else if (lastframe > frametime) {
        this.clearCanvas(this.staticctx);
        this.drawShapes({
          context: this.staticctx,
          shapeslist: static_shapes.slice(0, frametime),
          x, y, width, height,
        });
      }
    },

    follow(follow) {
      const { videoWidth, videoHeight, dimensions, pzinstance } = this;
      const { originalWidth, originalHeight } = dimensions;
      const { x, y, scale } = this.pzinstance.getTransform();
      const containerCoords = convert2d(follow.x, follow.y,
        [videoWidth, videoHeight],
        [originalWidth, originalHeight]);
      const scaledContainerCoords = scaleBox(containerCoords, scale * -1);
      const half = scaleBox([originalWidth / 2, originalHeight / 2], 1);
      pzinstance.moveTo(scaledContainerCoords[0] + half[0], scaledContainerCoords[1] + half[1]);
    },

    /* DRAW methods and canvas operations */

    setupCanvas(context, width, height) {
      const ctx = context;
      ctx.canvas.width = width;
      ctx.canvas.height = height;
    },

    clearCanvas(ctx) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    },

    /**
     * draw text over the entire canvas just draws a loading canvas
     */
    drawInfo(context, text) {
      const ctx = context;
      ctx.fillStyle = 'black';
      ctx.globalAlpha = 0.8;
      ctx.fillRect(
        0,
        0,
        Math.floor(ctx.canvas.width),
        Math.floor(ctx.canvas.height)
      );
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = 'white';
      ctx.font = '50px mono';
      const tw = ctx.measureText(text).width;
      ctx.fillText(
        text,
        ctx.canvas.width / 2 - tw / 2,
        ctx.canvas.height / 2 - 25
      );
    },

    /**
     * takes x, y in screen coordinates.
     */
    drawDot(context, x, y, radius, color, width, outlineColor = 'black') {
      const ctx = context;
      ctx.lineWidth = width;
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = outlineColor;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(Math.round(x), Math.round(y), Math.round(radius * CANVAS_SCALAR), 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fill();
      ctx.globalAlpha = 1.0;
    },

    /**
     * takes a, b, in screen coordinates
     */
    drawLine(context, a, b, width, color) {
      const ctx = context;
      ctx.lineWidth = Math.round(width * CANVAS_SCALAR);
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(Math.round(a[0]), Math.round(a[1]));
      ctx.lineTo(Math.round(b[0]), Math.round(b[1]));
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    },

    /**
     * draw an outline box
     */
    drawBox(context, x, y, width, height, lineWidth, color) {
      const ctx = context;
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.rect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
      ctx.stroke();
    },

    drawRegion(context, x, y, width, height, color, opacity) {
      // TODO
    },

    drawStamp(context, frame) {
      // TODO: review
      const { x, y } = this.pzinstance.getTransform();
      const ctx = context;
      ctx.fillStyle = 'black';
      ctx.font = '28px mono';
      const frameText = `frame ${Math.round(frame).toString()}`;
      const frameTextWidth = ctx.measureText(frameText).width;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(0, 0, Math.floor(frameTextWidth) + 8, 32);
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = 'white';
      ctx.fillText(frameText, 4, 26);
    },

    drawImage(context, x, y, src) {
      // TODO
    },

    drawLabel(context, x, y, text, bgcolor, textcolor) {
      // TODO: review
      ctx.font = '28px mono';
      ctx.fillStyle = bgcolor;
      ctx.strokeStyle = textcolor;
      const textWidth = ctx.measureText(text).width;
      ctx.fillRect(
        Math.round(x - 2),
        Math.round(y - 2),
        Math.round(textWidth) + 4,
        14
      );
      ctx.fillText(text, Math.floor(x), Math.floor(y));
    },

    /**
     * takes x, y, width, height in real video coordinates
     * draws shapes into the given context
     */
    drawShapes({ context, shapeslist, x = 0, y = 0, width, height }) {
      const ctx = context;
      const scale = ctx.canvas.width / width;
      const scalex = scale * x;
      const scaley = scale * y;
      // height scale == width scale to maintain aspect ratio
      shapeslist.forEach((shapes, frame) => {
        shapes.forEach(shape => {
          const { type: shapeType, color, data } = shape;
          let a, b, p, r;

          switch (shapeType) {
            case SHAPES.POINT:
              p = scaleBox(data.point, scale);
              this.drawDot(
                ctx,
                p[0] - scalex,
                p[1] - scaley,
                data.radius,
                color,
                data.width,
                data.outlineColor,
              );
              break;

            case SHAPES.LINE:
              a = scaleBox(data.a, scale);
              b = scaleBox(data.b, scale);
              this.drawLine(
                ctx,
                [a[0] - scalex, a[1] - scaley],
                [b[0] - scalex, b[1] - scaley],
                data.width,
                color
              );
              break;

            case SHAPES.BOX:
              b = scaleBox(data.box, scale);
              this.drawBox(
                ctx,
                b[0] - scalex,
                b[1] - scaley,
                b[2] - b[0],
                b[3] - b[1],
                data.width,
                color
              );
              break;

            case SHAPES.REGION:
              r = scaleBox(data.box, scale);
              const opacity = data.opacity;
              this.drawRegion(
                ctx,
                r[0] - scalex,
                r[1] - scaley,
                r[2] - r[0],
                r[3] - r[1],
                color,
                opacity
              );
              break;

            case SHAPES.IMAGE:
              this.drawImage();
              break;

            case SHAPES.LABEL:
              this.drawLabel();
              break;
          }
        });
      });
    },

    videoToHiddenCanvas(x, y, width, height) {
      const hiddenCanvas = this.$refs.hiddencanvas;
      const hiddenCtx = hiddenCanvas.getContext('2d');
      this.setupCanvas(hiddenCtx, width, height);
      hiddenCtx.drawImage(this.$refs.video, x, y, width, height, 0, 0, width, height);
      return hiddenCanvas;
    },

    /* UI CONTROL methods */

    canPlay() {
      if (this.playing) {
        this.$refs.video.play();
        this.loopSetup();
      } else {
        this.debounceLoop();
      }
      this.$emit('init');
    },

    click(e) {
      const { layerX, layerY } = e;
      const transformed = this._convertToVideoCoordinates(layerX, layerY);
      this.handleEvent(frametime, 'click', { x: transformed[0], y: transformed[1] });
    },

    resetMouse() {
      this.mouse = {
        width: 0,
        height: 0,
        drag: false
      };
      // TODO
      if (!this.playing) this.loop();
    },

    _convertToVideoCoordinates(x1, y1) {
      const { dimensions, videoWidth, videoHeight } = this;
      const { scale, x, y } = this.pzinstance.getTransform();
      const { originalWidth, originalHeight } = dimensions;
      const transformed = convert2d(x1 - x, y1 - y,
        scaleBox([originalWidth, originalHeight], scale),
        [videoWidth, videoHeight]);
      return transformed;
    },

    mousedown(e) {
      const { layerX, layerY } = e;
      const transformed = this._convertToVideoCoordinates(layerX, layerY);
      const vx = transformed[0];
      const vy = transformed[1];
      this.resetMouse();
      this.mouse.last_x = vx;
      this.mouse.last_y = vy;
      this.mouse.down_x = vx;
      this.mouse.down_y = vy;
      this.mouse.drag = true;
    },

    async mouseup() {
      if (this.mouse.drag && this.mode === MODES.DRAG) {
        const { down_x, down_y, last_x, last_y } = this.mouse;
        const width = last_x - down_x;
        const height = last_y - down_y;
        const canvas = this.videoToHiddenCanvas(down_x, down_y, width, height);
        this._handleEvent('dragdone', { down_x, down_y, width, height, canvas });
      }
      this.mouse.drag = false;
    },

    async mousemove(e) {
      const { mode, url, mouse } = this;
      const { down_x, down_y } = mouse;
      const { layerX, layerY } = e;
      const transformed = this._convertToVideoCoordinates(layerX, layerY);
      const last_x = transformed[0];
      const last_y = transformed[1];

      if (this.mouse.drag && mode === MODES.DRAG) {
        const width = last_x - down_x;
        const height = last_y - down_y;
        this._handleEvent('drag', { width, height, x: down_x, y: down_y });
      } else if (mode === MODES.HANDLE && url) {
        this._handleEvent('move', { x: last_x, y: last_y })
      }
      this.mouse.last_x = last_x;
      this.mouse.last_y = last_y;
    }
  }
};
</script>

<template lang="pug">
.video-region
  v-btn.closebutton.ma-0(v-if="dismissable", @click="$emit('dismiss')", fab, small)
    v-icon {{ $vuetify.icons.close }}
  canvas(ref="hiddencanvas", style="display: none;")
  v-layout.scroll-container(
      ref="scrollcontainer",
      column, align-start, justify-center, fill-height
      :style="{ width: `${containerWidth}px` }")
    .video-container(ref="videocontainer")
      canvas.static-canvas(ref="staticcanvas")
      canvas.canvas(ref="canvas")
      video(
          :crossorigin="crossorigin",
          ref="video",
          muted,
          :width="dimensions.width",
          :height="dimensions.height",
          @canplay="canPlay")
        source(:src="url", :crossorigin="crossorigin",
            @error="$emit('error', $event)")
        h1 Could not load video.
</template>

<style lang="scss" scoped>
.scroll-container {
  overflow: hidden;
}

.closebutton {
  right: 14px;
  top: 8px;
  z-index: 10;
  position: absolute;

  &:hover,
  &:focus,
  &:active {
    position: absolute;
  }
}

.video-container {
  position: relative;
}

canvas {
  position: absolute;
  z-index: 5;
  margin: auto;
  transform: scale(.5) translate(-50%, -50%);
  left: 0;
}
</style>
