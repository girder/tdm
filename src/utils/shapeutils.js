/*
  ShapeUtils contains functions for generating shapes from TDM.
  These are limited to trivial examples and serve as reference implementations,
  but they may be used.
*/
import { Rectangle, Point } from '../shapes';
import { centroid } from './tdm';

export const getCurrentBoxes = (store, namespace = 'tdm') => (frametime, lastframe) => {
  const tracks = store.getters[`${namespace}/activeContinuousFrames`](lastframe, frametime);
  const shapes = tracks
    .filter(({ detections }) => detections.length > 0)
    .map(({ detections }) => {
      const d = detections[detections.length - 1];
      return new Rectangle({
        x: d.box[0],
        y: d.box[1],
        width: d.box[2] - d.box[0],
        height: d.box[3] - d.box[1],
        color: undefined, // transparent
        borderColor: 'red',
        borderWidth: 3,
        opacity: 0.8,
      });
    });
  const current = [];
  current[frametime] = shapes;
  /*
    At this point, you could check to see
    if this.update existed, and generate `all`
    from whatever data was there.
  */
  return { current };
};

export const getCurrentCentroids = (store, namespace = 'tdm') => (frametime, lastframe) => {
  const tracks = store.getters[`${namespace}/activeContinuousFrames`](lastframe, frametime);
  const shapes = tracks
    .filter(({ detections }) => detections.length > 0)
    .map(({ detections }) => {
      const d = detections[detections.length - 1];
      const c = centroid(d.box, 0.5, 0.1);
      return new Point({
        x: c[0],
        y: c[1],
        color: 'red',
        radius: 4,
        width: 1,
        outlineColor: 'black',
        opacity: 0.4,
      });
    });
  const current = [];
  current[frametime] = shapes;
  return { current };
};
