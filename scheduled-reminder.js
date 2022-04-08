import { getNextReminderDate, now } from "./helper.js";

/**
 * @param {import("@slack/bolt").App} app
 */
export const debugReminders = async (app) => {
  const response = await app.client.chat.scheduledMessages.list();
  const messages = response.scheduled_messages;
  console.group(`List of scheduled messages: ${messages.length}`);
  messages.forEach((message) => {
    console.log(
      `To: ${message.channel_id}, at: ${message.post_at}, ID: ${message.id}`
    );
  });
  console.groupEnd();
};

/**
 * @param {import("@slack/bolt").App} app
 */
export const scheduleInitialMessages = async (app, allowedUserIds) => {
  const schedules = [];

  try {
    const { members } = await app.client.users.list();
    const users = members?.filter(
      (user) =>
        !user.deleted &&
        !user.is_bot &&
        user.name !== "slackbot" &&
        allowedUserIds.includes(user.id)
    );

    console.group("Scheduling reminder messages...");
    console.log(
      "Users",
      users.map((user) => ({
        id: user.id,
        name: user.name,
        real_name: user.real_name,
        tz_offset: user.tz_offset,
      }))
    );

    for (const user of users) {
      schedules.push(scheduleReminderMessage(app, user));
    }
    console.groupEnd();
  } catch (error) {
    console.log(error);
  }

  return Promise.all(schedules);
};

/**
 * Remove all previously scheduled messages
 * @param {import("@slack/bolt").App} app
 */
export const removeAllScheduledMessages = async (app) => {
  // TODO: check if we need to filter this and we're not deleting all scheduled messages from everyone
  const response = await app.client.chat.scheduledMessages.list();
  const messages = response.scheduled_messages;

  const deletes = messages
    // we're allowed to delete only scheduled messages that aren't firing in the next 60 seconds
    .filter((message) => message.post_at > now() + 60)
    .map((message) => {
      return app.client.chat.deleteScheduledMessage({
        channel: message.channel_id,
        scheduled_message_id: message.id,
      });
    });

  console.log("Deleting scheduled messages... ", deletes.length);
  return await Promise.all(deletes);
};

export const scheduleReminderMessage = async (app, user) => {
  const scheduleTime = getNextReminderDate(user.tz_offset);

  try {
    await app.client.chat.scheduleMessage({
      channel: user.id,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Hey there <@${user.id}>! It's time to show appreciation and think about all the good things your collegues done recently that made your day to day much better! Is there someone in special you would like to send a feedback to?`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Yes",
                emoji: true,
              },
              action_id: "show_user_select",
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "No",
                emoji: true,
              },
              action_id: "no_feedback",
            },
          ],
        },
      ],
      text: `Hey there <@${user.id}>! It's time to show appreciation and think about all the good things your collegues done recently that made your day to day much better! Is there someone in special you would like to send a feedback to?`,
      post_at: scheduleTime,
    });
    console.log(
      `Scheduled message for user: ${user.real_name} at ${scheduleTime}`
    );
  } catch (error) {
    console.log(error);
    console.log(error.data.response_metadata.messages);
  }
};
