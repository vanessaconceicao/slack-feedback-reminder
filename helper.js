export const getScheduleTime = () => {
  // TODO Consider user timezone
  const today = new Date();
  // tomorrow.setDate(tomorrow.getDate() + 1);
  // tomorrow.setHours(9, 0, 0);
  // tomorrow.setMinutes(tomorrow.getMinutes() + 1);
  today.setSeconds(today.getSeconds() + 10);
  const scheduleTime = today.getTime() / 1000;
  console.log(scheduleTime);

  return Math.round(scheduleTime);
};
