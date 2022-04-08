export const getNextReminderDate = (tz_offset = 0) => {
  const dayOfWeek = process.env.SLACK_REMINDER_DAY_OF_WEEK;
  const hour = process.env.SLACK_REMINDER_HOUR;
  const minute = process.env.SLACK_REMINDER_MINUTE;

  const today = new Date();
  const nextThursday = new Date(today.getTime());
  nextThursday.setDate(
    today.getDate() + ((dayOfWeek - today.getDay() + 7) % 7)
  );
  nextThursday.setHours(hour, minute, 0);
  const nextThursdayDate = nextThursday.getTime() / 1000;
  return Math.round(nextThursdayDate - tz_offset);
};

export const now = () => Math.round(new Date().getTime() / 1000);
