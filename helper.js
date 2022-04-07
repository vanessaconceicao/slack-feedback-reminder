export const getNextReminderDate = (tz_offset = 0) => {
  const today = new Date();
  const nextThursday = new Date(today.getTime());
  nextThursday.setDate(today.getDate() + ((4 - today.getDay() + 7) % 7));
  nextThursday.setHours(17, 0, 0);
  const nextThursdayDate = nextThursday.getTime() / 1000;
  return Math.round(nextThursdayDate - tz_offset);
};
