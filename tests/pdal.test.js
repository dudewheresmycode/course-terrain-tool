import { parseLAZPointInfo } from '../app/tasks/pdal_utils.js';

describe('pdal tests', () => {

  test('parseLAZPointInfo with classifications', () => {
    const info = parseLAZPointInfo({
      "file_size": 87417677,
      "filename": "/Users/brianrobinson/Projects/Personal/course-builds/soupy_test2/Downloads/USGS_LPC_NH_Connecticut_River_2015_19TCJ327824.laz",
      "now": "2025-01-21T22:29:17-0700",
      "pdal_version": "2.8.3 (git-version: Release)",
      "reader": "readers.las",
      "stats":
      {
        "statistic":
          [
            {
              "average": 1.405680566,
              "bins":
              {
                "1.000000": 8982351,
                "2.000000": 3972924,
                "3.000000": 732826,
                "4.000000": 43161,
                "5.000000": 677,
                "6.000000": 3
              },
              "count": 13731942,
              "counts":
                [
                  "1.000000/8982351",
                  "2.000000/3972924",
                  "3.000000/732826",
                  "4.000000/43161",
                  "5.000000/677",
                  "6.000000/3"
                ],
              "maximum": 6,
              "minimum": 1,
              "name": "ReturnNumber",
              "position": 0,
              "stddev": 0.6060458383,
              "variance": 0.3672915582
            },
            {
              "average": 1.394014263,
              "bins":
              {
                "1.000000": 8321785,
                "18.000000": 14,
                "2.000000": 5410103,
                "7.000000": 40
              },
              "count": 13731942,
              "counts":
                [
                  "1.000000/8321785",
                  "2.000000/5410103",
                  "7.000000/40",
                  "18.000000/14"
                ],
              "maximum": 18,
              "minimum": 1,
              "name": "Classification",
              "position": 1,
              "stddev": 0.4890109794,
              "variance": 0.239131738
            }
          ]
      }
    });

    console.log(info);

    expect(info).toEqual(expect.objectContaining({
      classifications: [
        { classification: 1, count: 8321785, type: 'unassigned' },
        { classification: 18, count: 14, type: 'high-noise' },
        { classification: 2, count: 5410103, type: 'ground' },
        { classification: 7, count: 40, type: 'low-point' }
      ],
      hasGroundPoints: true
    }))
  });

  test('parseLAZPointInfo without classifications', () => {
    const info = parseLAZPointInfo({
      "file_size": 78286494,
      "filename": "/Users/brianrobinson/Projects/Personal/course-builds/TestEverything/Downloads/USGS_LPC_CA_SANTACLARACO_A_2006_000063.laz",
      "now": "2025-01-21T23:11:55-0700",
      "pdal_version": "2.8.3 (git-version: Release)",
      "reader": "readers.las",
      "stats":
      {
        "statistic":
          [
            {
              "average": 1.052519923,
              "bins":
              {
                "1.000000": 18055533,
                "2.000000": 901829,
                "3.000000": 47380,
                "4.000000": 522
              },
              "count": 19005264,
              "counts":
                [
                  "1.000000/18055533",
                  "2.000000/901829",
                  "3.000000/47380",
                  "4.000000/522"
                ],
              "maximum": 4,
              "minimum": 1,
              "name": "ReturnNumber",
              "position": 0,
              "stddev": 0.2343338793,
              "variance": 0.05491236698
            },
            {
              "average": 1,
              "bins":
              {
                "1.000000": 19005264
              },
              "count": 19005264,
              "counts":
                [
                  "1.000000/19005264"
                ],
              "maximum": 1,
              "minimum": 1,
              "name": "Classification",
              "position": 1,
              "stddev": 0,
              "variance": 0
            }
          ]
      }
    });


    expect(info).toEqual(expect.objectContaining({
      classifications: [
        { classification: 1, count: 19005264, type: 'unassigned' }
      ],
      hasGroundPoints: false
    }))
  });
})