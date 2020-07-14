const walletDb = require("../db/wallet");
const consts = require("../consts");

exports.setup = (app) => {
  app.message(
    `<@${consts.botId}> Let's gamble!`,
    async ({ message, context, say }) => {
      const channel = message.channel;
      if (walletDb.getCurrentSeason(channel) !== 0) {
        await say("This channel is already set up to gamble!");
      } else {
        const result = await app.client.conversations.members({
          token: context.botToken,
          channel: message.channel,
        });
        result.members.forEach((item, index) => {
          if (item === consts.botId) {
            return;
          }
          walletDb.addWallet(channel, item, consts.defaultPoints, 1);
        });
        await say(
          `I've set up ${result.members.length - 1} wallets. Let's make a bet!`
        );
      }
    }
  );
};
