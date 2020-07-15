require("dotenv").config();
const {
  App
} = require("@slack/bolt");
const appHome = require("./apphome");
const walletDB = require("./db/wallet");
const betDB = require("./db/bet");
const betAcceptDB = require("./db/betAccept");
const mobVoteHandler = require("./actionHandlers/mobVoteHandler");
const betHandler = require("./actionHandlers/betHandler");
const betAcceptHandler = require("./actionHandlers/betAcceptHandler");
const mentionHandler = require("./actionHandlers/mentionHandler");
const submitResultsHandler = require("./actionHandlers/submitResultsHandler");
const leaderboardHandler = require("./actionHandlers/leaderboardHandler");
const betActionHandler = require("./actionHandlers/betActionHandler");
const cancelBetHandler = require("./actionHandlers/cancelBetHandler");
const memberJoinedHandler = require("./actionHandlers/memberJoinedHandler");

const utilities = require('./utilities/utilities');

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
});

betHandler.setup(app);
betHandler.setupBets(app);
betAcceptHandler.setup(app);
mentionHandler.setup(app);
mobVoteHandler.setup(app);
submitResultsHandler.setup(app);
leaderboardHandler.setup(app);
betActionHandler.setup(app);
cancelBetHandler.setup(app);
memberJoinedHandler.setup(app);

app.event("app_home_opened", ({
  event,
  say
}) => {
  // ignore if not the home tab
  if (event.tab !== "home") {
    return;
  }
  appHome.displayHome(event.user);
});

// Start your app
(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("⚡️ Bolt app is running!");
})();