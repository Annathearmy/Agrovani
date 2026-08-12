// Residue & Stubble economics engine (Tab 1).

export const DISTRICT_DATA = {
  Patiala: { rate: 1650, buyerDemand: 'High', machineryReadiness: 82, hotspots: 4, state: 'Punjab' },
  Ludhiana: { rate: 1720, buyerDemand: 'High', machineryReadiness: 88, hotspots: 6, state: 'Punjab' },
  Indore: { rate: 1480, buyerDemand: 'Medium', machineryReadiness: 71, hotspots: 2, state: 'Madhya Pradesh' },
  Nagpur: { rate: 1390, buyerDemand: 'Medium', machineryReadiness: 64, hotspots: 3, state: 'Maharashtra' },
  Guntur: { rate: 1550, buyerDemand: 'High', machineryReadiness: 76, hotspots: 3, state: 'Andhra Pradesh' },
};

export function getDistrictData(district) {
  return (
    DISTRICT_DATA[district] || {
      rate: 1500,
      buyerDemand: 'Medium',
      machineryReadiness: 70,
      hotspots: 2,
      state: 'India',
    }
  );
}

const PADDY_RESIDUE_FACTOR = 1.7; // tons per acre

export function computeResidue({ areaInAcres, district }) {
  const area = Number(areaInAcres) || 0;
  const d = getDistrictData(district);
  const residueTons = +(area * PADDY_RESIDUE_FACTOR).toFixed(2);
  const perAcre = PADDY_RESIDUE_FACTOR;
  const totalValueINR = Math.round(residueTons * d.rate);
  return {
    district,
    state: d.state,
    residueTons,
    perAcre,
    marketRate: d.rate,
    totalValueINR,
    buyerDemand: d.buyerDemand,
    machineryReadiness: d.machineryReadiness,
    hotspots: d.hotspots,
    riskLevel: d.hotspots >= 4 ? 'High' : d.hotspots >= 3 ? 'Medium' : 'Low',
  };
}
