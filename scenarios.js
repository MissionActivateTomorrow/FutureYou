// Defined early (before ES modules load) so onclick handlers never throw
window.goTo = function(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(sectionId);
  if (target) target.classList.add('active');
  window.scrollTo(0, 0);
};

const SALARY_MAP = { '<800':750, '800-1500':1150, '1500-3000':2250, '3000+':3500 };

function calculateScenarios(salaryRange, age) {
  const salary = SALARY_MAP[salaryRange] || 1150;
  const years  = Math.max(65 - age, 5);
  const monthlyStatePension = Math.round(salary * 0.24);
  const monthlyContrib      = salary * 0.10;
  const annualContrib       = monthlyContrib * 12;
  const totalSaved = Math.round(annualContrib * ((Math.pow(1.05, years) - 1) / 0.05));
  const monthlyThirdPillar  = Math.round(totalSaved / (12 * 20));
  const annualTaxRefund     = Math.round(annualContrib * 0.20);
  return {
    without: { monthlyPension: monthlyStatePension, annualTaxRefund },
    with:    { monthlyPension: monthlyStatePension + monthlyThirdPillar, annualTaxRefund, totalSaved },
    difference: monthlyThirdPillar
  };
}
