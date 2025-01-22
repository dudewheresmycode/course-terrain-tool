import { test } from '@jest/globals';
import {
  CRSUnits,
  addKilometers,
  detectUnit,
  feetToMeters,
  metersToFeet,
  metersToUSSurveyFeet,
  usSurveyFeetToMeters
} from '../app/utils/geo.js';

describe('geo utils', () => {

  test('usSurveyFeetToMeters', () => {
    const meters = usSurveyFeetToMeters(1000);

    expect(meters).toBe(304.800609604316);
  });

  test('feetToMeters', () => {
    const meters = feetToMeters(1000);

    expect(meters).toBe(304.79999024640034);
  });


  test('metersToUSSurveyFeet', () => {
    const meters = metersToUSSurveyFeet(1000);

    expect(meters).toBe(3280.8333333);
  });

  test('metersToFeet', () => {
    const meters = metersToFeet(1000);

    expect(meters).toBe(3280.84);
  });


  // US Survey Feet
  test('addKilometers in us-survey-feet', () => {
    const points = addKilometers([
      0, 0
    ], 1, {
      unit: CRSUnits.USFeet
    });

    expect(points).toEqual(expect.arrayContaining([
      3280.8333333,
      3280.8333333
    ]));
  });

  // Feet
  test('addKilometers in feet', () => {
    const points = addKilometers([
      0, 0
    ], 1, {
      unit: CRSUnits.Feet
    });

    expect(points).toEqual(expect.arrayContaining([3280.84, 3280.84]));
  });

  // Degrees
  test('addKilometers in degrees no CRS', () => {
    const points = addKilometers([
      0, 0
    ], 1, {
      unit: CRSUnits.Degrees
    });

    expect(points).toEqual(expect.arrayContaining([0.008983345800106981, 0.008983345800106981]));
  });

  // Meters
  test('addKilometers in meters', () => {
    const points = addKilometers([
      0, 0
    ], 1, {
      unit: CRSUnits.Meters
    });

    expect(points).toEqual(expect.arrayContaining([1000, 1000]));
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