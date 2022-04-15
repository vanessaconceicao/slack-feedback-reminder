import { getNextReminderDate, now } from "./helper.js";

/**
 * @param {import("@slack/bolt").App} app
 */
export const getAllScheduledMessages = async (app) => {
  /**
   * @type {import("@slack/web-api/dist/response/ChatScheduledMessagesListResponse").ScheduledMessage[]}
   */
  let messages = [];

  let has_more = true;
  let next_cursor = "";

  while (has_more) {
    const response = await app.client.chat.scheduledMessages.list({
      limit: 100,
      cursor: !!next_cursor ? next_cursor : undefined,
    });

    messages = [...messages, ...response.scheduled_messages];
    next_cursor = response.response_metadata.next_cursor;
    has_more = !!next_cursor;
  }

  return messages;
};

/**
 * @param {import("@slack/bolt").App} app
 */
export const getAllMembers = async (app) => {
  /**
   * @type {import("@slack/web-api/dist/response/UsersListResponse").Member[]}
   */
  let members = [];

  let has_more = true;
  let next_cursor = "";

  while (has_more) {
    const response = await app.client.users.list({
      limit: 100,
      cursor: !!next_cursor ? next_cursor : undefined,
    });

    members = [...members, ...response.members];
    next_cursor = response.response_metadata.next_cursor;
    has_more = !!next_cursor;
  }

  return members;
};

/**
 * @param {import("@slack/bolt").App} app
 */
export const debugReminders = async (app) => {
  const messages = await getAllScheduledMessages(app);
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
    const members = await getAllMembers(app);
    const users = members?.filter(
      (user) =>
        !user.deleted &&
        !user.is_bot &&
        user.name !== "slackbot" &&
        (allowedUserIds.length === 0 || allowedUserIds.includes(user.id))
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
  const messages = await getAllScheduledMessages(app);

  // we're allowed to delete only scheduled messages that aren't firing in the next 60 seconds
  const messagesToDelete = messages.filter(
    (message) => message.post_at > now() + 60
  );

  console.log("Deleting scheduled messages... ", messagesToDelete.length);

  for (let message of messagesToDelete) {
    await app.client.chat.deleteScheduledMessage({
      channel: message.channel_id,
      scheduled_message_id: message.id,
    });
  }

  return;
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
      `Scheduled message for user: ${user.name} - ${user.real_name} at ${scheduleTime}`
    );
  } catch (error) {
    console.log(error);
    console.log(error.data.response_metadata.messages);
  }
};
