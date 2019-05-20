<template lang="pug">
v-card.tdmtemporal.pa-1.pr-3.my-0(tile)
  v-layout(row, ref="container")
    selection-widget.shrink.my-0(
        v-if="selectable",
        v-bind="{ events }",
        @dropcursors="dropcursors")
    .tdmtemporalGraph.grow
      time-slider(style="width: 100%", v-bind="{ timebusName, duration, offset, framerate, followers }")
      .wrapper(style="width: 100%", ref="svgcontainer")
        svg(@mousemove="", :width="width", :height="height", ref="barsvg")
          g(v-for="group in groups", :style="{ transform: `translate(0px, ${group.top}px)`}")
            path.bar(v-for="path in group.paths" :d="path.d", :stroke="path.stroke", :opacity="path.opacity")
            text.bar(:x="group.text.x", :y="group.text.y", :dy="group.text.dy", :stroke="group.text.stroke") {{ group.text.text }}
          path(v-if="height > 0", v-for="(timeline, idx) in timelines", :key="idx", :d="timeline.d", :stroke="timeline.stroke")
  v-layout(column, align-end)
    svg(v-if="thresholdEnabled",
        :width="width", :height="thresholdHeight", @click="handleThreshClick")
      path(v-for="(timeline, idx) in timelines", :key="idx", :d="timeline.d", :stroke="timeline.stroke")
      g(:style="{ transform: `translate(0px, ${margin}px)` }")
        rect(:x="waterline.x", :y="waterline.y", :width="waterline.width", :height="waterline.height", :stroke="waterline.stroke", :fill="waterline.stroke", :opacity="waterline.opacity")
        path.thresh(v-for="path in threshPaths", :d="path.d", :stroke="path.stroke", :opacity="path.opacity")
        text.bar(:x="threshtext.x", :y="threshtext.y", :dy="threshtext.dy", :stroke="threshtext.stroke") {{ threshtext.text }}
    //- v-range-slider.my-0(
    //-     color="secondary",
    //-     :value="[offset, offset + duration]",
    //-     :min="0",
    //-     :max="originalDuration",
    //-     :step=".5"
    //-     @input="setRange", :style="{ width: width + 'px'}", hide-details)
    //- v-layout(row, justify-end, align-center)
    //-   p.subheading.mt-1.mb-0.mr-3 {{ thresholdMin }}
    //-   v-range-slider.mt-1(:value="[thresholdMin, thresholdMax]",
    //-     color="secondary",
    //-     hide-details,
    //-     style="width: 100px"
    //-     :min="0",
    //-     :max="1",
    //-     :step=".02",
    //-     @input="setThreshBounds({ min: $event[0], max: $event[1] })")
    //-   p.subheading.mt-1.mb-0.ml-4(style="min-width: 40px;") {{ thresholdMax }}
</template>

<script>
import { createNamespacedHelpers } from 'vuex'
const { mapState, mapMutations } = createNamespacedHelpers('tdm')
import * as d3 from 'd3';
import TimeSlider from './TimeSlider';
import SelectionWidget from './SelectionWidget';
import TimeBus from '../utils/timebus';
import { valBetween } from '../utils';
import { STATES } from '../utils/tdm';

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
    margin: {
      type: Number,
      default: 10,
    },
    timebusName: {
      type: String,
      default: 'master',
    },
    events: {
      type: Object,
      required: true,
    },
    thresholdTracks: {
      type: Array,
      required: true,
    },
    offset: {
      type: Number,
      default: 0,
    },
    duration: {
      type: Number,
      required: true,
    },
    framerate: {
      type: Number,
      default: 30,
    },
    threshold: {
      validator: prop => typeof prop === 'number' || prop === null,
      required: true,
    },
    colormap: {
      type: Object,
      required: true,
    },
    statemap: {
      type: Object,
      required: true,
    },
    /* Array<{
     *   name: String, // name of the follower bus.
     *   distance: Number // scalar distance from master.
     * }>
     */
    followers: {
      type: Array,
      default: () => [],
    },
    outerwidth: {
      type: Number,
      default: 500,
    },
    selectable: {
      type: Boolean,
      default: true,
    },
  },

  data() {
    return {
      xbuffer: 2,
      stroke: 24,
      time: 0,
    };
  },

  mounted() {
    TimeBus.$on(`${this.timebusName}:active`, this.settime);
    TimeBus.$on(`${this.timebusName}:passive`, this.settime);
  },

  beforeDestroy() {
    TimeBus.$off(`${this.timebusName}:active`, this.settime);
    TimeBus.$off(`${this.timebusName}:passive`, this.settime);
  },

  computed: {
    ...mapState([
      'colorBy', 'thresholdKey',
      'originalDuration', 'thresholdMin',
      'thresholdMax',
    ]),

    width() {
      return this.outerwidth - (this.selectable ? 52 : 18);
    },

    thresholdEnabled() {
      return typeof threshold === 'number' && events.length > 0;
    },

    height() {
      const { stroke, xbuffer, events } = this;
      return (stroke + xbuffer) * Object.keys(events).length;
    },

    groups() {
      const { offset, framerate, duration, events, xbuffer, width, stroke, colorBy, colormap } = this;
      const x = d3
        .scaleLinear()
        .domain([offset * framerate, (offset + duration) * framerate])
        .range([0, width]);
      const lineFunction = d3
        .line()
        .defined(d => d)
        .x(d => x(d))
        .y(d => 0);
      return Object.keys(events).map((groupByKey, i) => {
        const tracksByGroup = events[groupByKey];
        // There should be 1 group for each sort-by group in the colormap
        const liney = xbuffer + (stroke / 2) + ((stroke + xbuffer) * i);
        const paths = [].concat(...tracksByGroup.map(eventsByTrack => eventsByTrack.map(event => {
          const metaValue = event.meta[colorBy];
          return {
            d: lineFunction([event.begin, event.end]),
            stroke: colormap[metaValue] || '#ccc',
            opacity: 0.4,
          };
        })));
        // Add background grey
        paths.push({
          d: lineFunction([offset * framerate + 0.001, (offset + duration) * framerate]),
          stroke: '#ccc',
          opacity: 0.2,
        });
        return {
          text: { x: 10, y: 0, dy: '.35em', text: groupByKey, stroke: '#555' },
          top: liney,
          paths,
        };
      });
    },

    threshPaths() {
      const {
        offset, framerate, duration, width,
        thresholdHeight, thresholdMin, thresholdMax,
        statemap, colorBy, thresholdTracks } = this;
      const x = d3.scaleLinear()
        .domain([offset * framerate, (offset + duration) * framerate])
        .range([0, width]);
      const y = d3.scaleLinear()
        .domain([thresholdMin, thresholdMax])
        .range([thresholdHeight - (2 * margin), 0]);
      const lineFunc = d3.line()
        .x(d => x(d.frame))
        .y(d => y(d.meta[thresholdKey] || NaN));
      return thresholdTracks.map(t => ({
        d: lineFunc(t.detections),
        stroke: statemap[t.meta[colorBy]] === STATES.ACTIVE ? t.color : '#ccc',
        opacity: 0.5,
      }));
    },

    timelines() {
      const { followers, duration, width, thresholdHeight, timebusName, time } = this;
      return [{
        name: timebusName,
        distance: 0,
      }].concat(followers).map((timeline, index) => {
        const x = d3
          .scaleLinear()
          .domain([0, duration])
          .range([0, width]);
        const lineFunc = d3
          .line()
          .x(d => x(d[0]))
          .y(d => d[1]);
        return {
          d: lineFunc([
              [time + timeline.distance, 0],
              [time + timeline.distance, thresholdHeight],
          ]),
          stroke: '#000',
        };
      });
    },

    waterline() {
      const { thresholdHeight, thresholdMin, thresholdMax, margin, width, threshold } = this;
      const y = d3.scaleLinear()
        .domain([thresholdMin, thresholdMax])
        .range([thresholdHeight - (2 * margin), 0]);
      return {
        x: 0,
        y: y(threshold),
        width,
        height: y(thresholdMax - threshold),
        stroke: '#fdbf6f',
        opacity: 0.3,
      };
    },

    threshtext() {
      return {
        x: 10,
        y: 0,
        dy: '.35em',
        text: String(this.threshold),
        stroke: '#555',
      };
    },
  },

  methods: {
    ...mapMutations(['setThreshold', 'setThreshBounds']),

    settime(time) { this.time = time - this.offset; },

    handleThreshClick(event) {
      const y = d3.scaleLinear()
        .domain([0, this.thresholdHeight - (2 * this.margin)])
        .range([this.thresholdMax, this.thresholdMin]);
      const threshold = parseFloat(valBetween(y(event.offsetY - this.margin), 0, 1).toPrecision(4));
      this.setThreshold({ threshold });
    },

    setRange(event) {
      this.$emit('update:duration', event[1] - event[0]);
      this.$emit('update:offset', event[0]);
    },

    dropcursors(groupBy) {
      // given a groupBy value, drop follower cursors for all series above thresh.
      const framerate = this.framerate;
      const events = [].concat(...this.events[groupBy]);
      if (events.length) {
        const firstEventBeginFrame = events[0].begin;
        const followerEvents = events.slice(1);
        const followers = followerEvents.map((event, i) => {
          const name = `follower${i}`;
          const distance = (event.begin - firstEventBeginFrame) / framerate;
          return { name, distance };
        });
        this.$emit('update:followers', followers);
        TimeBus.$emit(`${this.timebusName}:active`, (firstEventBeginFrame / framerate));
        this.$nextTick(() => followers.forEach(follower => {
          TimeBus.$emit(`${follower.name}:active`, (firstEventBeginFrame / framerate)  + follower.distance);
        }));
      } else {
        this.$emit('update:followers', []);
      }
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

.smallinput {
  width: 80px;
}

path.bar {
  fill: none;
  stroke-width: 20px;
}

path.thresh {
  fill: none;
  stroke-width: 2px;
}

text.bar {
  user-select: none;
}
</style>
