require("dotenv").config();
const { App } = require("@slack/bolt");
const store = require("./store");
const axios = require("axios");
const qs = require("qs");

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
});

app.event("app_home_opened", ({ event, say }) => {
  // ignore if not the home tab
  if (event.tab !== "home") {
    return;
  }
  // Look up the user from DB
  let user = store.getUser(event.user);
  console.log(event);

  if (!user) {
    user = {
      user: event.user,
      channel: event.channel,
    };
    store.addUser(user);

    say(`Hello world, and welcome <@${event.user}>!`);
  }

  displayHome(event.user, user);
});

const displayHome = async (slackuser, user) => {
  const args = {
    token: process.env.SLACK_BOT_TOKEN,
    user_id: slackuser,
    view: await updateView(user),
  };
  const result = await axios
    .post("https://slack.com/api/views.publish", qs.stringify(args))
    .then(function (response) {
      console.log(response);
    })
    .catch(function (error) {
      console.log(error);
    });
};

const updateView = async (user) => {
  let blockArray = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        // todo change to user's name
        text: "Welcome " + JSON.stringify(user),
      },
    },
    {
      type: "divider",
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          "This is an app for gambling. Gambling can be fun, but can also be dangerous. Only gamble what you're willing to lose.\r\n\r\nThe National Council on Problem Gambling Helpline offers a confidential, 24-hour helpline for problem gamblers or their family members at 1-800-522-4700",
      },
    },
    {
      type: "image",
      image_url:
        "https://www.bestuscasinos.org/wp-content/uploads/2019/12/Gambling-Mistake-1.jpg",
      alt_text: "This is what happens when you gamble",
    },
  ];

  let view = {
    type: "home",
    title: {
      type: "plain_text",
      text: "Gambling is dangerous",
    },
    blocks: blockArray,
  };
  return JSON.stringify(view);
};

// Start your app
(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("⚡️ Bolt app is running!");
})();
