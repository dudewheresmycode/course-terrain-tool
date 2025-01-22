import { test } from '@jest/globals';
import { CRSUnits, addKilometers, detectUnit } from '../app/utils/geo.js';

describe('geo utils', () => {

  // US Survey Feet
  test('addKilometers in us-feet with CRS', () => {
    const points = addKilometers([
      0, 0
    ], 1, {
      unit: 'meters',
      // actually us-feet
      id: { authority: 'EPSG', code: 2227 }
    });

    expect(points).toEqual(expect.arrayContaining([
      3280.8333333,
      3280.8333333
    ]));
  });

  test('addKilometers in us-feet no CRS', () => {
    const points = addKilometers([
      0, 0
    ], 1, {
      unit: 'US Survey feet'
    });

    expect(points).toEqual(expect.arrayContaining([
      3280.8333333,
      3280.8333333
    ]));
  });

  // Feet
  test('addKilometers in feet no CRS', () => {
    const points = addKilometers([
      0, 0
    ], 1, {
      unit: 'feet'
    });

    expect(points).toEqual(expect.arrayContaining([3280.84, 3280.84]));
  });

  test('addKilometers in feet no CRS', () => {
    const points = addKilometers([
      0, 0
    ], 1, {
      unit: 'feet',
      id: { authority: 'EPSG', code: 2222 }
    });

    expect(points).toEqual(expect.arrayContaining([3280.84, 3280.84]));
  });

  // Meters
  test('addKilometers in meters from CRS', () => {
    const points = addKilometers([
      0, 0
    ], 1, {
      unit: '',
      id: { authority: 'EPSG', code: 2019 }
    });

    expect(points).toEqual(expect.arrayContaining([1000, 1000]));
  });

  test('addKilometers in meters no CRS', () => {
    const points = addKilometers([
      0, 0
    ], 1, {
      unit: 'metres'
    });

    expect(points).toEqual(expect.arrayContaining([1000, 1000]));
  });

  test('addKilometers in meters upper case', () => {
    const points = addKilometers([
      0, 0
    ], 1, {
      unit: 'Meters'
    });

    expect(points).toEqual(expect.arrayContaining([1000, 1000]));
  });

  test('addKilometers in degrees no CRS', () => {
    const points = addKilometers([
      0, 0
    ], 1, {
      unit: 'Degree'
    });

    expect(points).toEqual(expect.arrayContaining([0.008983345800106981, 0.008983345800106981]));
  });

  test('addKilometers in degrees from CRS', () => {
    const points = addKilometers([
      0, 0
    ], 1, {
      unit: 'degree',
      id: { authority: 'EPSG', code: 6318 }
    });

    expect(points).toEqual(expect.arrayContaining([0.008983345800106981, 0.008983345800106981]));
  });

  test('addKilometers in meters by default', () => {
    const points = addKilometers([
      0, 0
    ], 1, {});

    expect(points).toEqual(expect.arrayContaining([1000, 1000]));
  });


  test.each([
    // ['USfeet', CRSUnits.USFeet],
    ['survey foot', CRSUnits.USFeet],
    ['survey feet', CRSUnits.USFeet],
    ['us survey feet', CRSUnits.USFeet],
    ['US survey Feet', CRSUnits.USFeet],
    ['US survey foot', CRSUnits.USFeet],
    ['US Survey Foot', CRSUnits.USFeet],

    ['ft', CRSUnits.Feet],
    ['feet', CRSUnits.Feet],
    ['foot', CRSUnits.Feet],
    ['fts', CRSUnits.Feet],

    ['Meters', CRSUnits.Meters],
    ['meters', CRSUnits.Meters],
    ['meteres', CRSUnits.Meters],
    ['metre', CRSUnits.Meters],
    ['metres', CRSUnits.Meters],
    ['m', CRSUnits.Meters],

    ['degrees', CRSUnits.Degrees],

    ['bad', CRSUnits.Meters],
    ['', CRSUnits.Meters],
  ])('Test unit formats %s should be %s', (a, b) => {
    const res = detectUnit(a);
    expect(res).toBe(b);
  });

  // test('US Survey Foot', () => {
  //   const detected = detectUnit('US Survey Foot')

  //   expect(detected).toBe(CRSUnits.Feet);
  // });

  // test('Meters', () => {
  //   const detected = detectUnit('Meters')

  //   expect(detected).toBe(CRSUnits.Meters);
  // });

  // test('m', () => {
  //   const detected = detectUnit('m')

  //   expect(detected).toBe(CRSUnits.Meters);
  // });

});