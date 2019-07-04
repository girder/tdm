/*
  ShapeUtils contains functions for generating shapes from TDM.
  These are limited to trivial examples and serve as reference implementations,
  but they may be used.
*/
import { Rectangle } from '../shapes';

export const getShapes = (store, namespace = 'tdm') => (frametime, lastframe) => {
  const tracks = store.getters[`${namespace}/activeContinuousFrames`](lastframe, frametime);
  const shapes = tracks
    .filter(({ detections }) => detections.length > 0)
    .map(({ detections }) => {
      const d = detections[detections.length - 1];
      // console.log(d)
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
