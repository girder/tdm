<script>
import panzoom from 'panzoom';

import { scaleBox, SHAPES } from '../utils/tdm';
import { MODES } from '../constants';
import { convert2d, getPosition } from '../utils';

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
    src: {
      type: String,
      required: true,
    },
    containerWidth: {
      /* Width of the canvas in pixels */
      type: Number,
      required: true
    },
    containerHeight: {
      type: Number,
      required: true
    },
    sourceWidth: {
      type: Number,
      required: true,
    },
    sourceHeight: {
      type: Number,
      required: true,
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
    noSourceMessage: {
      type: String,
      default: 'Source Unavailable',
    },
    drawAllStatic: {
      type: Boolean,
      default: false, // Only draw static shapes in the past by default.
    }
  },
  data() {
    return {
      ctx: null,
      staticctx: null,
      pzinstance: null,
      belayEvent: false,
      mouse: {
        down_x: 0,
        down_y: 0,
        last_x: 0,
        last_y: 0
      },
    };
  },
  computed: {
    dimensions() {
      const {
        containerWidth,
        containerHeight,
        sourceWidth,
        sourceHeight,
        zoom
      } = this;
      let screenWidth = containerWidth;
      let screenHeight = (containerWidth / sourceWidth) * sourceHeight;
      if (screenHeight > containerHeight) {
        // TODO: return width where height is limiting factor.
      }
      const width = screenWidth;
      const height = screenHeight;
      const scale = sourceWidth / width;
      return { width, height, screenWidth, screenHeight, scale };
    }
  },

  watch: {
    dimensions() {
      const { ctx, staticctx, dimensions, src, noSourceMessage } = this;
      if (ctx && staticctx) {
        this.setupCanvas(ctx, dimensions.width * CANVAS_SCALAR, dimensions.height * CANVAS_SCALAR);
        this.setupCanvas(staticctx, dimensions.width * CANVAS_SCALAR, dimensions.height * CANVAS_SCALAR);
        this.resetStatic();
        if (!src) {
          this.drawInfo(ctx, noSourceMessage);
        } else {
          this.update(frametime);
        }
      }
    },

    loading() {
      this.update(frametime);
    },

    mode(newval) {
      if (newval === MODES.DRAG || newval === MODES.HANDLE) {
        this.pzinstance.pause();
      } else {
        this.pzinstance.resume();
      }
    }
  },

  beforeDestroy() {
    window.removeEventListener('mouseup', this.mouseup, false);
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
    
    // The following may be Zero-width if parent has not yet computed the width.
    const { width, height } = this.dimensions;
    this.setupCanvas(this.ctx, width * CANVAS_SCALAR, height * CANVAS_SCALAR);
    this.setupCanvas(this.staticctx, width * CANVAS_SCALAR, height * CANVAS_SCALAR);
    // this.resetMouse();
    this.pzinstance = panzoom(this.$refs.canvascontainer, {
      maxZoom: 6,
      minZoom: 0.7,
      smoothScroll: false
    });
    // Belay click and other events during a pan
    this.pzinstance.on('pan', () => {
      this.belayEvent = true;
    });
    if (this.mode === MODES.DRAG || this.mode === MODES.HANDLE) {
      this.pzinstance.pause();
    }
    this.$refs.canvas.addEventListener('click', this.click, false);
    this.$refs.canvas.addEventListener('mousedown', this.mousedown, false);
    this.$refs.canvas.addEventListener('mousemove', this.mousemove, false);
    window.addEventListener('mouseup', this.mouseup, false);
    
    if (!this.src)
      this.drawInfo(this.ctx, this.noSourceMessage);
    else
      this.update(frametime);
  },
  methods: {

    async _handleEvent(event_type, event) {
      const { sourceWidth, sourceHeight } = this;
      const { all, append, current, follow } = await this.handleEvent(
        frametime, event_type, event,
      );
      this.processShapes({
        all, append, current, follow,
        lastframe: frametime,
        frametime,
        x: 0, y: 0,
        width: sourceWidth,
        height: sourceHeight
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
        width: this.sourceWidth,
        height: this.sourceHeight
      });
    },

    resetZoom(x = 0, y = 0, zoom = 0.95) {
      this.pzinstance.zoomAbs(0, 0, zoom);
      if (x || y) {
        const { sourceWidth, sourceHeight, dimensions } = this;
        const { screenWidth, screenHeight } = dimensions;
        const scale = (screenWidth*zoom) / sourceWidth;
        x = ((-1 * x) + (sourceWidth/(2*zoom))) * scale;
        y = ((-1 * y) + sourceHeight/(2*zoom)) * scale;
      }
      this.pzinstance.moveTo(x, y);
      this.belayEvent = false;
    },

    /**
     * This function should be used to guarantee that loop is invoked
     * with prevent=false.
     */
    update(thisFrame, lastframe) {
      lastframe = lastframe || frametime;
      frametime = thisFrame;

      if (this.ctx && this.staticctx) {
        if (this.loading) {
          this.clearCanvas(this.ctx);
          this.drawInfo(this.ctx, 'LOADING...');
        } else {
          const { all, append, current, follow } = this.getShapes(frametime, lastframe);
          this.processShapes({
            all, append, current, follow,
            lastframe, frametime,
            x: 0, y: 0,
            width: this.sourceWidth,
            height: this.sourceHeight
          });
        }
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
      if (!this.src) {
        this.drawInfo(this.ctx, this.noSourceMessage);
        return;
      }

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
        let shapeslist = [];
        if (this.drawAllStatic) {
          shapeslist = static_shapes;
        } else {
          shapeslist = static_shapes.slice(0, frametime);
        }
        this.drawShapes({
          context: this.staticctx,
          shapeslist,
          x, y, width, height,
        });
      } else if (lastframe < frametime && !this.drawAllStatic) {
        append.forEach((shapes, index) => {
          static_shapes[index] = shapes;
        });
        const shapeslist = static_shapes.slice(lastframe, frametime);
        this.drawShapes({
          context: this.staticctx, shapeslist,
          x, y, width, height,
        });
      } else if (lastframe > frametime && !this.drawAllStatic) {
        this.clearCanvas(this.staticctx);
        this.drawShapes({
          context: this.staticctx,
          shapeslist: static_shapes.slice(0, frametime),
          x, y, width, height,
        });
      }
    },

    follow(follow) {
      const { sourceWidth, sourceHeight, dimensions, pzinstance } = this;
      const { screenWidth, screenHeight } = dimensions;
      const { x, y, scale } = this.pzinstance.getTransform();
      const containerCoords = convert2d(follow.x, follow.y,
        [sourceWidth, sourceHeight],
        [screenWidth, screenHeight]);
      const scaledContainerCoords = scaleBox(containerCoords, scale * -1);
      const half = scaleBox([screenWidth / 2, screenHeight / 2], 1);
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
      ctx.globalAlpha = 0.7;
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
     * takes x, y, width, height in real source coordinates
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

    /* UI CONTROL methods */

    click(e) {
      const { offsetX, offsetY } = getPosition(e);
      const transformed = this._convertToSourceCoordinates(offsetX, offsetY);
      this._handleEvent('click', { x: transformed[0], y: transformed[1], belay: this.belayEvent })
      this.belayEvent = false;
    },

    resetMouse() {
      this.mouse = {
        width: 0,
        height: 0,
        drag: false
      };
      this.update(frametime);
    },

    _convertToSourceCoordinates(x1, y1) {
      const { dimensions, sourceWidth, sourceHeight } = this;
      const { scale } = this.pzinstance.getTransform();
      const { screenWidth, screenHeight } = dimensions;
      const transformed = convert2d(x1, y1,
        scaleBox([screenWidth, screenHeight], scale),
        [sourceWidth, sourceHeight]);
      return transformed;
    },

    mousedown(e) {
      const { offsetX, offsetY } = getPosition(e);
      const transformed = this._convertToSourceCoordinates(offsetX, offsetY);
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
        let { down_x, down_y, last_x, last_y } = this.mouse;
        let width = last_x - down_x;
        let height = last_y - down_y;
        if (width < 0) {
          down_x = down_x + width;
          width = -1 * width;
        }
        if (height < 0) {
          down_y = down_y + height;
          height = -1 * height;
        }
        this._handleEvent('dragdone', { x: down_x, y: down_y, width, height });
      }
      this.mouse.drag = false;
    },

    async mousemove(e) {
      const { mode, src, mouse } = this;
      let { down_x, down_y } = mouse;
      const { offsetX, offsetY } = getPosition(e);
      const transformed = this._convertToSourceCoordinates(offsetX, offsetY);
      const last_x = transformed[0];
      const last_y = transformed[1];

      if (this.mouse.drag && mode === MODES.DRAG) {
        let width = last_x - down_x;
        let height = last_y - down_y;
        if (width < 0) {
          down_x = down_x + width;
          width = -1 * width;
        }
        if (height < 0) {
          down_y = down_y + height;
          height = -1 * height;
        }
        this._handleEvent('drag', { width, height, x: down_x, y: down_y });
      } else if (mode === MODES.HANDLE && (src)) {
        this._handleEvent('move', { x: last_x, y: last_y })
      }
      this.mouse.last_x = last_x;
      this.mouse.last_y = last_y;
    }
  }
};
</script>

<template lang="pug">
.annotation-container
  v-btn.closebutton.ma-0(v-if="dismissable", @click="$emit('dismiss')", fab, small)
    v-icon {{ $vuetify.icons.close }}
  canvas.ma-4.hidden(ref="hiddencanvas")
  v-layout.scroll-container(
      ref="scrollcontainer",
      column, align-start, justify-center, fill-height
      :style="{ width: `${dimensions.screenWidth}px` }")
    .canvas-container(ref="canvascontainer")
      canvas.static-canvas(ref="staticcanvas")
      canvas.canvas(ref="canvas")
      slot(name="source",
          v-bind="{ width: dimensions.width, height: dimensions.height, update, src, timebusName }")
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

.canvas-container, .annotation-container {
  position: relative;
}

canvas {
  position: absolute;
  z-index: 5;
  margin: auto;
  transform: scale(.5) translate(-50%, -50%);
  left: 0;

  &.hidden {
    display: none;
  }
}
</style>
