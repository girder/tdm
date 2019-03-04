<template lang="pug">
.tdmtemporal.py-2
  v-layout(row, ref="container")
    selection-widget.shrink.mx-2.my-0
    .tdmtemporalGraph.grow
      time-slider(style="width: 100%")
      .wrapper(style="width: 100%", ref="svgcontainer")
        svg(@mousemove="", :width="width", :height="height", ref="barsvg")
          g(v-for="group in groups", :style="{ transform: `translate(0px, ${group.top}px)`}")
            path.bar(v-for="path in group.paths" :d="path.d", :stroke="path.stroke", :opacity="path.opacity")
            text.bar(:x="group.text.x", :y="group.text.y", :dy="group.text.dy", :stroke="group.text.stroke") {{ group.text.text }}
          path(:d="timeline.d", :stroke="timeline.stroke")
  v-layout(row, justify-end, v-if="(typeof threshold === 'number') && tracks.length")
    svg(:width="width", :height="thresholdHeight", @click="handleThreshClick")
      path(:d="timeline.d", :stroke="timeline.stroke")
      g(:style="{ transform: `translate(0px, ${margin}px)` }")
        rect(:x="waterline.x", :y="waterline.y", :width="waterline.width", :height="waterline.height", :stroke="waterline.stroke", :fill="waterline.stroke", :opacity="waterline.opacity")
        //- path(:d="threshline.d", :stroke="threshline.stroke", :opacity="threshline.opacity")
        path.thresh(v-for="path in threshPaths", :d="path.d", :stroke="path.stroke", :opacity="path.opacity")
        text.bar(:x="threshtext.x", :y="threshtext.y", :dy="threshtext.dy", :stroke="threshtext.stroke") thresh: {{ threshtext.text }}
</template>

<script>
import { mapState } from 'vuex';
import * as d3 from 'd3';
import TimeSlider from './TimeSlider';
import SelectionWidget from './SelectionWidget';
import TimeBus from '../utils/timebus';
import { valBetween } from '../utils';
import { STATES, seriesForThreshold } from '../utils/tdm';

export default {
  components: {
    TimeSlider,
    SelectionWidget,
  },
  props: {
    thresholdHeight: {
      type: Number,
      default: 150,
    },
    thresholdKey: {
      type: String,
      default: 'confidence',
    },
    threshold: {
      type: Number,
      default: null,
    },
    margin: {
      type: Number,
      default: 10,
    },
  },
  data() {
    return {
      xbuffer: 2,
      stroke: 36,
      width: 100,
      time: 0,
      /* set by reactions to watched properties */
      groups: [],
      threshPaths: [],
      height: 100,
      series: [],
      timeline: {},
      waterline: {},
      threshtext: {},
      /* range variables */
      drag: false,
    };
  },
  mounted() {
    TimeBus.$on('active', time => (this.time = (time - this.offset)));
    TimeBus.$on('passive', time => (this.time = (time - this.offset)));
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
    const svg = this.$refs.barsvg;
    svg.addEventListener('mousedown', this.listen);
    svg.addEventListener('mouseup', this.ignore);
    svg.addEventListener('mouseleave', this.ignore);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize);
  },
  computed: {
    ...mapState(['cache', 'colormap', 'statemap', 'offset', 'duration', 'framerate', 'tracks', 'colorBy']),
  },
  watch: {
    colormap() {
      this.setSeries();
      this.setThreshPaths();
      this.setThreshText();
    },
    statemap() {
      this.setGroups();
      this.setThreshPaths();
    },
    time() {
      this.setTimeline();
    },
    series() {
      this.setGroups();
      this.setHeight();
    },
    width() {
      this.setHeight();
      this.setTimeline();
      this.setWaterline();
      this.setGroups();
      this.setThreshPaths();
      this.setThreshText();
    },
    duration() {
      this.setGroups();
      this.setThreshPaths();
      this.setTimeline();
    },
    framerate() {
      this.setGroups();
      this.setThreshPaths();
    },
    threshold() {
      this.setWaterline();
      this.setSeries();
      this.setThreshText();
    },
  },
  methods: {
    /* Handlers for setting playback range */
    // listen(e) {
    //   console.log(e);
    // },
    // ignore(e) {
    //   console.log(e);
    // },
    // onmove(e) {
    //   console.log(e);
    // },
    handleResize() {
      // TODO: this is terrible.
      this.$nextTick(() => {
        const cwidth = this.$refs.container.clientWidth;
        this.width = this.$refs.svgcontainer.clientWidth;
        if (this.width > cwidth) {
          // hack to make room for checkboxes.
          this.width = cwidth - 50;
        }
      });
    },
    handleThreshClick(event) {
      const y = d3.scaleLinear()
        .domain([0, this.thresholdHeight - (2 * this.margin)])
        .range([1, 0]);
      this.$emit('update:threshold', parseFloat(valBetween(y(event.offsetY - this.margin), 0, 1).toPrecision(4)));
    },
    /* Setters to avoid computed prop perf hit */

    setGroups() {
      const x = d3
        .scaleLinear()
        .domain([0, this.duration * this.framerate])
        .range([0, this.width]);
      const lineFunction = d3
        .line()
        .defined(d => d)
        .x(d => x(d))
        .y(d => 0);
      this.groups = this.series.map((s, i) => {
        const liney =
          this.xbuffer + this.stroke / 2 + (this.stroke + this.xbuffer) * i;
        const paths = [].concat(...s.data.map(bars => bars.map(bar => ({
          d: lineFunction(bar),
          stroke: this.statemap[s.key] === STATES.ACTIVE ? s.color : '#ccc',
          opacity: 0.4,
        }))));
        paths.push({
          d: lineFunction([0.01, this.duration * this.framerate]),
          stroke: '#ccc',
          opacity: 0.2,
        });
        return {
          text: {
            x: 10,
            y: 0,
            dy: '.35em',
            text: s.key,
            stroke: '#555',
          },
          top: liney,
          paths,
        };
      });
    },
    setThreshPaths() {
      const x = d3.scaleLinear()
        .domain([0, this.duration * this.framerate])
        .range([0, this.width]);
      const y = d3.scaleLinear()
        .domain([0, 1])
        .range([this.thresholdHeight - (2 * this.margin), 0]);
      const lineFunc = d3.line()
        .x(d => x(d.frame))
        .y(d => y(d.meta[this.thresholdKey] || NaN));
      this.threshPaths = this.tracks.map(t => ({
        d: lineFunc(t.detections),
        stroke: this.statemap[t.meta[this.colorBy]] === STATES.ACTIVE ? t.color : '#ccc',
        opacity: 0.5,
      }));
    },
    setHeight() {
      this.height = (this.stroke + this.xbuffer) * this.series.length;
    },
    setSeries() {
      this.series = Object.keys(this.colormap).map((sm) => {
        let data;
        if (this.threshold) {
          data = seriesForThreshold(this.cache[sm], this.threshold, this.thresholdKey);
        } else {
          data = this.cache[sm].map(track => [[track.begin + 0.01, track.end]]);
        }
        return {
          key: sm,
          data,
          color: this.colormap[sm],
        };
      });
    },
    setTimeline() {
      const x = d3
        .scaleLinear()
        .domain([0, this.duration])
        .range([0, this.width]);
      const lineFunc = d3
        .line()
        .x(d => x(d[0]))
        .y(d => d[1]);
      this.timeline = {
        d: lineFunc([[this.time, 0], [this.time, this.height + 100]]),
        stroke: '#000',
      };
    },
    setWaterline() {
      const y = d3.scaleLinear()
        .domain([0, 1])
        .range([this.thresholdHeight - (2 * this.margin), 0]);
      this.waterline = {
        x: 0,
        y: y(this.threshold),
        width: this.width,
        height: y(1 - this.threshold),
        stroke: '#fdbf6f',
        opacity: 0.3,
      };
    },
    setThreshText() {
      this.threshtext = {
        x: 10,
        y: 0,
        dy: '.35em',
        text: String(this.threshold),
        stroke: '#555',
      };
    },
  },
};
</script>

<style lang="stylus" scoped>
.tdmtemporalGraph {
  box-sizing: border-box;

  svg {
    position: relative;
  }
}

path.bar {
  fill: none;
  stroke-width: 32px;
}

path.thresh {
  fill: none;
  stroke-width: 2px;
}

text.bar {
  user-select: none;
}
</style>
