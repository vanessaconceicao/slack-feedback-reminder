import { config } from "dotenv";
import bolt from "@slack/bolt";

config();

import {
  scheduleReminderMessage,
  removeAllScheduledMessages,
  scheduleInitialMessages,
  debugReminders,
} from "./scheduled-reminder.js";

const PUBLIC_CHANNEL_ID = process.env.SLACK_PUBLIC_CHANNEL_ID;

if (!PUBLIC_CHANNEL_ID) {
  throw new Error(
    "You need to set the environment variable SLACK_PUBLIC_CHANNEL_ID"
  );
}

// Initializes your app with your bot token and signing secret
const app = new bolt.App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

(async () => {
  // Start your app

  await app.start(process.env.PORT || 3000);
  console.log("⚡️ Bolt app is running!");

  await debugReminders(app);
  await removeAllScheduledMessages(app);
  await scheduleInitialMessages(app);
  await debugReminders(app);
})();

app.action("no_feedback", async ({ body, ack }) => {
  await ack();
  await endSession(body.user);
  await scheduleReminderMessage(app, user);
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
  await scheduleReminderMessage(app, user);
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
    text: `What would you like to say to <@${selectedUserId}>?`,
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
          text: `How would you like to share your feedback?`,
        },
        accessory: {
          type: "radio_buttons",
          initial_option: {
            value: "private",
            text: {
              type: "mrkdwn",
              text: `Share this message with <@${selectedUserId}> only`,
            },
          },
          options: [
            {
              text: {
                type: "mrkdwn",
                text: `Share this message with <@${selectedUserId}> only`,
              },
              value: "private",
            },
            {
              text: {
                type: "mrkdwn",
                text: `Share this message with <@${selectedUserId}> and in <#${PUBLIC_CHANNEL_ID}> channel`,
              },
              value: "public",
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
              text: "Send & share more",
              emoji: true,
            },
            value: selectedUserId,
            action_id: "restart-cicle",
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Send",
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

app.action("restart-cicle", async ({ body, ack, action }) => {
  await ack();
  await sendFeedback(action, body);

  selecteUser(body.user);
});

app.action("finish-cycle", async ({ body, ack, action }) => {
  await ack();

  await sendFeedback(action, body);
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
            text: `<@${senderUserId}> just shared this feedback about you`,
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

const sendFeedbackToPublicChannel = async (
  targetUserId,
  senderUserId,
  message,
  channelId
) => {
  await app.client.chat.postMessage({
    channel: channelId,
    text: message,
    blocks: [
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `<@${senderUserId}> just shared a feedback about <@${targetUserId}>`,
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

const sendMessageToSenderUser = async (body, userId, message) => {
  await app.client.chat.delete({
    channel: body.user.id,
    ts: body.message.ts,
  });

  await app.client.chat.postMessage({
    channel: body.user.id,
    blocks: [
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Here is the message you shared about <@${userId}>`,
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
    text: message,
  });
};

const sendFeedback = async (action, body) => {
  const userId = action.value;
  const senderUserId = body.user.id;
  const message =
    body.state.values["feedback-text-block"]["feedback-text-filled"].value;
  const share =
    body.state.values["feedback-options-block"]["share-radio-action"]
      .selected_option.value;

  if (share === "public") {
    await Promise.all([
      sendFeedbackToPublicChannel(
        userId,
        senderUserId,
        message,
        PUBLIC_CHANNEL_ID
      ),
      sendFeedbackToUser(userId, senderUserId, message),
      sendMessageToSenderUser(body, userId, message),
    ]);
  }

  if (share === "private") {
    await Promise.all([
      sendFeedbackToUser(userId, senderUserId, message),
      sendMessageToSenderUser(body, userId, message),
    ]);
  }
};

app.event("team_join", async ({ event }) => {
  try {
    await scheduleReminderMessage(app, event.user);
  } catch (error) {
    console.log(error);
  }
});

// TODO: reschedule message in case user doesn't respond Yes or No to first message
