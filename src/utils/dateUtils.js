// src/utils/dateUtils.js
export function getWeekCode(date) {
    const target = new Date(date);
    const dayNr = (target.getDay() + 6) % 7; // Monday = 0
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = new Date(target.getFullYear(), 0, 4);
    const diff = target - firstThursday;
    const weekNumber = 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
    return `${weekNumber < 10 ? '0' + weekNumber : weekNumber}-${target.getFullYear()}`;
  }

export function getHumanReadableWeek(date) {
  const target = new Date(date);
  const dayNr = (target.getDay() + 6) % 7; // Monday = 0
  
  const monday = new Date(target);
  monday.setDate(target.getDate() - dayNr);
  
  const options = { day: 'numeric', month: 'long', year: 'numeric' };
  const formattedDate = monday.toLocaleDateString('fr-FR', options);
  
  return `Semaine du ${formattedDate}`;
}
  