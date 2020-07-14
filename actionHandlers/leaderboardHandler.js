const consts = require("../consts");
const walletDb = require("../db/wallet");

const maxNToDisplay = 10;

exports.setup = (app) => {
  app.command(
    `/${consts.commandPrefix}bookie-leaderboard`,
    async ({ ack, body, context, say }) => {
      await ack();
      const channel = body.channel_id;
      const season = walletDb.getCurrentSeason(channel);
      const wallets = walletDb.getAllWalletsForSeason(channel, season, false);

      if (!wallets || !wallets.length || wallets.length === 0) {
        say(
          `<@${body.user_id}> oh no! I can't show you a leaderboard because I didn't find any wallets for this season. Has gambling been set up in this channel?`
        );
        return;
      }

      const sortAscending = body.text === "bottom";
      wallets.sort((w1, w2) => {
        const flip = sortAscending ? -1 : 1;
        return flip * (w2.points - w1.points);
      });
      const n = Math.min(maxNToDisplay, wallets.length);
      const toDisplay = wallets.slice(0, n);

      const userLines = [];

      await Promise.all(
        toDisplay.map(async (w) => {
          const response = await app.client.users.info({
            token: context.botToken,
            user: w.slackId,
          });

          userLines.push({
            points: w.points,
            text: `- ${response.user.name}: ${w.points} points`,
          });
        })
      );

      // Re-sort here since I'm pretty sure the async looping can mess up the order
      userLines.sort((w1, w2) => {
        const flip = sortAscending ? -1 : 1;
        return flip * (w2.points - w1.points);
      });

      const txt = `\`\`\`${userLines.map((ul) => ul.text).join("\n")}\`\`\``;

      const blocks = [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Here are the ${
              sortAscending ? "bottom" : "top"
            } ${n} wallets for this season`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: txt,
          },
        },
      ];

      app.client.chat.postMessage({
        token: context.botToken,
        channel: channel,
        blocks,
      });
    }
  );
};
