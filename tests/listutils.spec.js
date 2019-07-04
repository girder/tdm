/* eslint-disable no-undef */

import { binarySearch, findRange, insert, remove } from '../src/utils/listutils';

describe('binarySearch', () => {
  it('works for a single element', () => {
    const arr = [5];
    expect(binarySearch(arr, 5, (a, b) => a - b)).toBe(0);
  });
});

describe('findRange', () => {
  it('returns empty arrays for invalid options', () => {
    expect(findRange([], 1, 2)).toHaveLength(0);
    expect(findRange([{ foo: 'bar' }, { invalid: true }], 1, 0)).toHaveLength(0);
  });

  it('produces ranges for a given array', () => {
    const a1 = [{ key: 1 }, { key: 12 }, { key: 13 }];
    const r1 = findRange(a1, 0, 2);
    expect(r1.length).toBe(0);

    const r2 = findRange(a1, 1, 4);
    expect(r2.length).toBe(2);
    expect(r2[0].key).toBe(1);
    expect(r2[1].key).toBe(12);

    const r3 = findRange(a1, 1, 20);
    expect(r3.length).toBe(3);
    expect(r3[0].key).toBe(1);

    const r4 = findRange(a1, 2, 13);
    expect(r4.length).toBe(3);
    expect(r4[0].key).toBe(1);

    const r5 = findRange(a1, 13, 14);
    expect(r5).toHaveLength(1);

    const r6 = findRange(a1, 2, 3);
    expect(r6).toHaveLength(2);
    expect(r6[0].key).toBe(1);
    expect(r6[1].key).toBe(12);
  });
});

describe('insert', () => {
  it('inserts items into array', () => {
    const arr = [];
    insert(arr, { key: 20 });
    insert(arr, { key: 30 });
    expect(arr).toHaveLength(2);
    expect(arr[0].key).toBe(20);
  });
});

describe('remove', () => {
  it('removes items from a sorted array', () => {
    const arr = [
      { key: 0 },
      { key: 10 },
      { key: 12 },
      { key: 13 },
    ];
    remove(arr, { key: 4 });
    expect(arr).toHaveLength(4);
    remove(arr, { key: 10 });
    expect(arr).toHaveLength(3);
    expect(arr[1].key).toBe(12);
  });
});
