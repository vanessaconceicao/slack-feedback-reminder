import { getNextReminderDate, now } from "./helper.js";

/**
 * Remove all previously scheduled messages
 * @param {import("@slack/bolt").App} app
 */
export const removeAllScheduledMessages = async (app) => {
  // TODO: check if we need to filter this and we're not deleting all scheduled messages from everyone
  const response = await app.client.chat.scheduledMessages.list();
  const messages = response.scheduled_messages;

  console.log({ now: now(), messages });

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
  } catch (error) {
    console.log(error);
    console.log(error.data.response_metadata.messages);
  }
};
