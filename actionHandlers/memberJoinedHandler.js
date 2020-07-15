const walletDB = require("../db/wallet");
const consts = require("../consts");

exports.setup = (app) => {
  app.event('member_joined_channel', async ({ event, context }) => {
      walletDB.addWallet(event.channel, event.user, consts.defaultPoints, walletDB.getCurrentSeason(event.channel));
    }
  );
};
