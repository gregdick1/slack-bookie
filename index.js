require("dotenv").config();
const {
  App
} = require("@slack/bolt");
const appHome = require("./apphome");
const wallet = require("./db/wallet");
const betHandler = require("./actionHandlers/betHandler");
const betModal = require('./bet-modal');

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
});

betModal.setup(app);
betHandler.setup(app);

app.event('app_home_opened', ({
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
  // wallet.save();

  // let season = wallet.getCurrentSeason(event.channel);
  // wallet.addWallet(event.channel, event.user, 1000, season + 1);
  // let wallet1 = wallet.getWallet(event.channel, event.user);
  // let wallet2 = wallet.getWalletForSeason(event.channel, event.user, 1);
  // let test = wallet.getCurrentSeason('asdf');

  console.log(event);

  let walletsForUser = wallet.getAllWalletsForUser(event.user);
  appHome.displayHome(event.user, walletsForUser);

  if (!walletsForUser || walletsForUser.length === 0) {
    say(`Hello world, and welcome <@${event.user}>!`);
  }

});

// Start your app
(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("⚡️ Bolt app is running!");
})();