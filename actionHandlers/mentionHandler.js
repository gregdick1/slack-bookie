const wallet = require("../db/wallet");

const defaultPoints = 1000;
exports.setup = (app, botId) => {
  app.message(
    `<@${botId}> Let's gamble!`,
    async ({ message, context, say }) => {
      //TODO set up bot id as config or pull it during app startup or something
      const channel = message.channel;
      if (wallet.getCurrentSeason(channel) !== 0) {
        await say("This channel is already set up to gamble!");
      } else {
        const result = await app.client.conversations.members({
          token: context.botToken,
          channel: message.channel,
        });
        result.members.forEach((item, index) => {
          if (item === botId) {
            return;
          }
          wallet.addWallet(channel, item, defaultPoints, 1);
        });
        await say(
          `I've set up ${result.members.length - 1} wallets. Let's make a bet!`
        );
      }
    }
  );
};