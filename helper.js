export const getNextReminderDate = (tz_offset = 0) => {
  const dayOfWeek = process.env.SLACK_REMINDER_DAY_OF_WEEK;
  const hour = process.env.SLACK_REMINDER_HOUR;
  const minute = process.env.SLACK_REMINDER_MINUTE;

  const today = new Date();
  const nextThursday = new Date(today.getTime());
  nextThursday.setDate(
    today.getDate() + ((7 + dayOfWeek - today.getDay()) % 7)
  );
  nextThursday.setHours(hour, minute, 0);

  if (toTimestamp(nextThursday) - tz_offset < toTimestamp(today)) {
    // in case hour is in the past, add a week
    nextThursday.setDate(nextThursday.getDate() + 7);
  }

  const nextThursdayDate = nextThursday.getTime() / 1000;
  return Math.round(nextThursdayDate - tz_offset);
};

export const toTimestamp = (date) => Math.round(date.getTime() / 1000);

export const now = () => toTimestamp(new Date());
