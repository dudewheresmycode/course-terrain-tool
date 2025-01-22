

const ClassificationTypes = {
  Unclassified: { code: 0, id: 'unclassified' },
  Unassigned: { code: 1, id: 'unassigned' },
  Ground: { code: 2, id: 'ground' },
  LowVegetation: { code: 3, id: 'low-vegetation' },
  MediumVegetation: { code: 4, id: 'med-vegetation' },
  HighVegetation: { code: 5, id: 'high-vegetation' },
  Building: { code: 6, id: 'building' },
  LowPoint: { code: 7, id: 'low-point' },
  Reserved: { code: 8, id: 'reserved' },
  Water: { code: 9, id: 'water' },
  Rail: { code: 10, id: 'rail' },
  Road: { code: 11, id: 'road-surface' },
  Reserved: { code: 12, id: 'reserved' },
  WireGuard: { code: 13, id: 'wire-guard' },
  WireConductor: { code: 14, id: 'wire-conductor' },
  TransmissionTower: { code: 15, id: 'transmission-tower' },
  WireStructureConnector: { code: 16, id: 'wire-structure-connector' },
  Bridge: { code: 17, id: 'bridge' },
  HighNoise: { code: 18, id: 'high-noise' },
};


export function parseLAZPointInfo(infoResponse) {
  const classificationStats = infoResponse.stats.statistic.find(item => item.name === 'Classification')?.bins;
  // const returnNumberStats = infoResponse.stats.statistic.find(item => item.name === 'ReturnNumber')?.bins;
  console.log(classificationStats);
  let hasGroundPoints = false;
  const classifications = Object.entries(classificationStats).map(([key, val]) => {
    const pointClass = parseFloat(key);
    const pointType = Object.values(ClassificationTypes).find(type => (pointClass > type.code - 1) && pointClass <= type.code);
    if (pointType?.id === 'ground' && val > 0) {
      hasGroundPoints = true;
    }
    return {
      classification: pointClass,
      count: val,
      type: pointType?.id || 'unknown'
    }
  });
  return {
    hasGroundPoints,
    // returnNumberStats,
    classifications
  };
}