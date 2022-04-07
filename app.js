import { config } from "dotenv";
import bolt from "@slack/bolt";

import { getScheduleTime } from "./helper.js";

config();

// Initializes your app with your bot token and signing secret
const app = new bolt.App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

(async () => {
  // Start your app

  await app.start(process.env.PORT || 3000);
  console.log("⚡️ Bolt app is running!");
})();

const scheduleInitialMessages = async () => {
  try {
    const { members } = await app.client.users.list();
    const users = members?.filter((user) => !user.is_bot);
    console.log(users);

    for (const user of users) {
      scheduleMessage(user.id);
    }
  } catch (error) {
    console.log(error);
  }
};

scheduleInitialMessages();

const scheduleMessage = async (user, postAt) => {
  const scheduleTime = postAt || getScheduleTime();

  try {
    await app.client.chat.scheduleMessage({
      channel: user,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Hey there <@${user}>! It's time to show appreciation and think about all the good things your collegues done recently that made your day to day much better! Is there someone in special you would like to send a feedback to?`,
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
      text: `Hey there <@${user}>! It's time to show appreciation and think about all the good things your collegues done recently that made your day to day much better! Is there someone in special you would like to send a feedback to?`,
      post_at: scheduleTime,
    });
  } catch (error) {
    console.log(error);
    console.log(error.data.response_metadata.messages);
  }
};

app.action("no_feedback", async ({ body, ack }) => {
  await ack();
  await endSession(body.user);
  // Schedule next session for 3 days
});

const endSession = async (user) => {
  await app.client.chat.postMessage({
    channel: user.id,
    blocks: [
      {
        type: "divider",
      },
      {
        type: "section",
        text: {
          type: "plain_text",
          text: "Ok, I'll check again in a few days.",
          emoji: true,
        },
      },
    ],
    text: "Ok, I'll check again in a few days.",
  });
};

app.action("show_user_select", async ({ body, ack }) => {
  await ack();
  await selecteUser(body.user);
  //  Schedule next session for 3 days
});

const selecteUser = async (user) => {
  await app.client.chat.postMessage({
    channel: user.id,
    blocks: [
      {
        type: "divider",
      },
      {
        block_id: "user-select-block",
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Who is it?*",
        },
        accessory: {
          type: "users_select",
          placeholder: {
            type: "plain_text",
            text: "Select someone",
            emoji: true,
          },
          action_id: "user-selected",
        },
      },
    ],
    text: "Who is it?",
  });
};

app.action("user-selected", async ({ body, ack }) => {
  await ack();
  console.log(body);

  const action = body.actions.find(
    (action) => action.action_id === "user-selected"
  );

  console.log(body.message.ts);
  console.log("ts", body.message_ts);

  await getFeedback(body.user, action.selected_user);

  await app.client.chat.delete({
    channel: body.user.id,
    ts: body.message.ts,
  });
});

const getFeedback = async (user, selectedUserId) => {
  await app.client.chat.postMessage({
    channel: user.id,
    text: `What would you like to say to <@${selectedUserId}>`,
    blocks: [
      {
        type: "input",
        block_id: "feedback-text-block",
        element: {
          type: "plain_text_input",
          multiline: true,
          action_id: "feedback-text-filled",
        },
        label: {
          type: "plain_text",
          text: `What would you like to say to <@${selectedUserId}>`,
          emoji: true,
        },
      },
      {
        type: "section",
        block_id: "feedback-options-block",
        text: {
          type: "mrkdwn",
          text: `*Would you like to share this message with <@${selectedUserId}>?*`,
        },
        accessory: {
          type: "radio_buttons",
          initial_option: {
            value: "no-value",
            text: {
              type: "plain_text",
              text: "No, I want to keep this message private",
            },
          },
          options: [
            {
              text: {
                type: "plain_text",
                text: "Yes, I want to share",
                emoji: true,
              },
              value: "yes-value",
            },
            {
              text: {
                type: "plain_text",
                text: "No, I want to keep this message private",
                emoji: true,
              },
              value: "no-value",
            },
          ],
          action_id: "share-radio-action",
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Send more feedback",
              emoji: true,
            },
            value: selectedUserId,
            action_id: "restart-cicle",
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Done",
              emoji: true,
            },
            value: selectedUserId,
            action_id: "finish-cycle",
          },
        ],
      },
    ],
  });
};

app.action("share-radio-action", async ({ body, ack }) => {
  await ack();
});

app.action("restart-cicle", async ({ body, ack }) => {
  await ack();
  console.log("restart", body.state);
  // Get the typed feedback and send to selected_user (check if something was typed)
  // Modify text area to show the feedback as plain text

  console.log("ts", body.message.ts);
  console.log("body", body);

  // await app.client.chat.update({
  //   channel: body.user.id,
  //   ts: body.message.ts,
  //   blocks: [
  //     {
  //       type: 'section',
  //       text: {
  //         type: 'plain_text',
  //         text: '<Add the typed feedback here>',
  //         emoji: true,
  //       },
  //     },
  //   ],
  //   text: '<Add the typed feedback here>',
  // });

  selecteUser(body.user);
});

app.action("finish-cycle", async ({ body, ack, action }) => {
  await ack();

  const userId = action.value;
  const senderUserId = body.user.id;
  const message =
    body.state.values["feedback-text-block"]["feedback-text-filled"].value;

  await sendFeedbackToUser(userId, senderUserId, message);
  await showSendGratz(body.user);
});

const sendFeedbackToUser = async (targetUserId, senderUserId, message) => {
  await app.client.chat.postMessage({
    channel: targetUserId,
    text: message,
    blocks: [
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `<@${senderUserId}> just shared`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: message,
        },
      },
    ],
  });
};

const showSendGratz = async (user) => {
  await app.client.chat.postMessage({
    channel: user.id,
    blocks: [
      {
        type: "divider",
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*What about sending some Gratz today?*",
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Send Gratz",
              emoji: true,
            },
            value: "click_me_123",
            url: "https://getgratz.com/users",
            action_id: "send-gratz-action",
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "No",
              emoji: true,
            },
            value: "click_me_123",
            action_id: "finish-flow",
          },
        ],
      },
    ],
    text: "What about sending some Gratz today?",
  });
};

app.action("finish-flow", async ({ body, ack }) => {
  await ack();
  finishFlow(body.user);
});

app.action("send-gratz-action", async ({ body, ack }) => {
  await ack();
  finishFlow(body.user);
});

const finishFlow = async (user) => {
  await app.client.chat.postMessage({
    channel: user.id,
    blocks: [
      {
        type: "divider",
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Thanks for sharing! See you in a few days :wave:",
        },
      },
    ],
    text: "Thanks for sharing! See you in a few days :wave:",
  });
};

// TODO handle wehn user changes the selected user to give feedback - https://api.slack.com/messaging/modifying#deleting
// TODO: Make bot listen to user entering workspace and leaving to schedule and remove scheduled messages
// Delete https://api.slack.com/messaging/scheduling?track=scheduling-messages#deleting

// TODO send message to other user with the typed feedback if option is selected
// TODO always send typed feedback to current or make the input readonly
// TODO chek if messages will scheduled when Slack Bot is added to workspace
// TODO Consider user timezone to set the schedule time to 6pm
// TODO Schedule next session for 3 days

// Build UI https://app.slack.com/block-kit-builder/T039XU4QXL4

// https://api.slack.com/interactivity/handling#payloads
//https://slack.dev/bolt-js/concepts#acknowledge
// https://api.slack.com/interactivity/handling
