/* eslint-disable no-undef */

import { interpolateFrames, getInterpolatedRange } from '../src/utils/tdm';

describe('interpolateFrames', () => {
  it('can perform simple interpolation', () => {
    const d0 = {
      frame: 0,
      box: [0, 0, 10, 10],
    };
    const d1 = {
      frame: 10,
      box: [10, 10, 20, 20],
    };
    const result = interpolateFrames(5, d0, d1);
    expect(result.box).toHaveLength(4);
    expect(result.frame).toBe(5);
    const expectedResult = [5, 5, 15, 15];
    result.box.forEach((b, i) => {
      expect(b).toBe(expectedResult[i]);
    });
  });

  it('works in lower and higher dimensions', () => {
    const d0 = { frame: 200, box: [10, 20, 30, 40, 50, 60, 70, 80] };
    const d1 = { frame: 300, box: [20, 30, 40, 50, 60, 70, 80, 90] };
    const result = interpolateFrames(250, d0, d1);
    expect(result.box).toHaveLength(8);
  });

  it('preserves meta', () => {
    const d0 = { frame: 0, box: [1, 1], meta: { a: 20 } };
    const d1 = { frame: 2, box: [2, 2], meta: {} };
    const result = interpolateFrames(200, d0, d1);
    expect(result.frame).toBe(200);
    expect(result.meta.a).toBe(20);
  });
});

describe('getInterpolatedRange', () => {
  it('interpolates the end frame', () => {
    const detections = [
      { frame: 0, box: [0, 0, 10, 10] },
      { frame: 10, box: [0, 0, 20, 20] },
      { frame: 110, box: [0, 0, 40, 40] },
      { frame: 200, box: [0, 0, 40, 40] },
    ];
    const r1 = getInterpolatedRange(detections, 1, 60);
    const expectedResult = [
      { box: [0, 0, 10, 10], frame: 0 },
      { box: [0, 0, 20, 20], frame: 10 },
      { box: [0, 0, 30, 30], frame: 60, meta: { interpolated: true } },
    ];
    expect(r1).toHaveLength(3);
    r1.forEach((d, i) => {
      d.box.forEach((x, j) => expect(x).toBe(expectedResult[i].box[j]));
    });
    expect(r1[2].meta.interpolated).toBeTruthy();

    const r2 = getInterpolatedRange(detections, 200, 201);
    expect(r2).toHaveLength(1);
    expect(r2[0].frame).toBe(200);

    const r3 = getInterpolatedRange(detections, 150, 151);
    expect(r3).toHaveLength(2);
    expect(r3[0].frame).toBe(110);
    expect(r3[1].frame).toBe(151);
    expect(r3[1].meta.interpolated).toBeTruthy();

    const r4 = getInterpolatedRange(detections, 1, 2);
    expect(r4).toHaveLength(2);
    expect(r4[0].frame).toBe(0);
    expect(r4[1].frame).toBe(2);
  });
});
