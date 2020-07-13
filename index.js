require("dotenv").config();
const {
  App
} = require("@slack/bolt");
const appHome = require("./apphome");
const walletDB = require("./db/wallet");
const betDB = require("./db/bet");
const betHandler = require("./actionHandlers/betHandler");
const mentionHandler = require("./actionHandlers/mentionHandler");
const betModal = require("./bet-modal");

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
});

const botId = process.env.SLACK_BOT_ID;

betModal.setup(app);
betHandler.setup(app);
mentionHandler.setup(app, botId);

app.event("app_home_opened", ({
  event,
  say
}) => {
  // ignore if not the home tab
  if (event.tab !== "home") {
    return;
  }

  //Testing the db stuff
  // let userWallet = wallet.getWallet(event.channel, event.user);
  // userWallet.points = userWallet.points + 500;
  // walletDB.save();

  // let season = walletDB.getCurrentSeason(event.channel);
  // walletDB.addWallet(event.channel, event.user, 1000, season + 1);
  // let wallet1 = walletDB.getWallet(event.channel, event.user);
  // let wallet2 = walletDB.getWalletForSeason(event.channel, event.user, 1);
  // let test = walletDB.getCurrentSeason('asdf');

  console.log(event);

  const walletsForUser = walletDB.getAllWalletsForUser(event.user);
  const allBetsForUser = betDB.getAllBetsForUser(event.user);
  appHome.displayHome(event.user, event.channel, walletsForUser, allBetsForUser);

  if (!walletsForUser || walletsForUser.length === 0) {
    say(`Hello world, and welcome <@${event.user}>!`);
  }
});

// Start your app
(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("⚡️ Bolt app is running!");
})();