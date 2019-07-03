# TDM (Tracks, Detections, Metadata)

TDM is:

* an abstract visualization schema for describing video annotations
* a Vue.js component library for displaying those annotations
* additional capabilities for creating custom interfaces based on video.

Tracks, Detections, and Metadata, are the most basic units of 2D spaceotemporal video annotation data.

TDM is **not concerned** with your specific domain, data format, or use case.  It is your responsibility to translate your annotations to the TDM schema.

Signal-type metadata is also supported with/without associated spacial detections.  This is useful for displaying data computed about an entire video frame, such as "how bright is it?" or "what is the probability that a particular metric is true right now?".

## Displaying TDM data

A minimal application to display TDM might look like this:

```javascript
import { SHAPES } from 'tdm/src/utils/tdm';

class TDMImpl {

  constructor(store) {
    this.store = store;
    this.update = null;
  }

  /**
   * The notify method should be registered with tdm's vuex store
   * It will be called when control widgets recolor, enable/disable,
   * or otherwise manipulate the state.
   * 
   * If the current view depends on all detections (past and present).
   * notify should recompute the view.
   * 
   * It returns empty.
   */
  notify({ tracks, colormap, statemap, cache, colorBy }) {
    this.update = { /* Whatever */ };
  }

  /**
   * GetShapes will be called whenever the onscreen frame changes.
   */
  getShapes(frametime, lastframe) {
    const detections = this.store.getters['tdm/activeContinuousFrames'](lastframe, frametime);
    const shapes = detections.map(d => ({
      // Transform a detection into a green box with 3px sidex
      type: SHAPES.BOX,
      color: 'green',
      data: {
        box: d.box,
        width: 3,
      },
    }));
    const current = [];
    current[frametime] = shapes;
    /*
      At this point, you could check to see
      if this.update existed, and generate `all`
      from whatever data was there.
    */
    const all = this.update;
    return { current, all };
  }
}
```

#### App.vue

```javascript
import TDMImpl from './tdmimpl.js';

export default {
  data() {
    return {
      impl: new TDMImpl(this.$store)
    },
  },
  mounted() {
    this.store.commit('tdm/setNotidier', { notifier: this.impl });
  },
}
```

## Demo

Try the demo at https://girder.github.io/tdm/

## Example data

Here's some trivial data. 

```js
const tracks = [
  {
    key: 'track 1',
    meta: {
      activity: 'pick up object',
      object: 'person',
    },
    begin: 40,
    end: 80,
    detections: [
      { frame: 40, box: [10, 10, 30, 50], meta: {} },
      ...
    ]
  },
  {
    key: 'track 2',
    meta: {
      activity: 'pick up object',
      object: 'bag',
    },
    begin: 43,
    end: 80,
    detections: [...],
  }
]
```

## Development

You will most likely want to consume tdm from another project.

1. Run `yarn link` from this directory
2. Run `yarn link tdm` in your consumer app.
