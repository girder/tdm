# TDM (Tracks, Detections, Metadata)

TDM is both:

* an abstract visualization schema for describing video annotations
* a Vue.js component library for displaying those annotations

Tracks, Detections, and Metadata, are the most basic units of 2D spaceotemporal video annotation data.

TDM is **not concerned** with your specific domain, data format, or use case.  It is your responsibility to translate your annotations to the TDM schema.  Right now, this library is best suited for bounding box data.

Signal-type metadata is also supported with our without associated spacial detections.  This is useful for displaying data computed about an entire video frame, such as "What is the probability that a particular event is happening right now".

This library is not well suited for generating or collecting new video annotations.

## Demo

Try the demo at https://girder.github.io/tdm/

## Example data

Here's some trivial data.  When rendered, these tracks can be colored, sorted, and filtered by their metadata.  

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
    detections: [...]
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
