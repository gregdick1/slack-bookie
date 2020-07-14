const mobVote = require("../db/mobVote");
const wallet = require("../db/wallet");
const consts = require("../consts");

const resetChannel = async (channel, app, context) => {
  const result = await app.client.conversations.members({
    token: context.botToken,
    channel: channel,
  });

  const currentSeason = wallet.getCurrentSeason(channel);
  result.members.forEach((item, index) => {
    if (item === consts.botId) {
      return;
    }
    wallet.addWallet(channel, item, consts.defaultPoints, currentSeason + 1);
  });
};

exports.setup = (app) => {
  // Listen for a slash command invocation
  app.command(
    `/${consts.commandPrefix}bookie-channel-reset`,
    async ({ ack, body, context, say }) => {
      // Acknowledge the command request
      await ack();

      let result = await say(
        "A vote to reset the bookie wallets in this channel has been initiated! React with :yes: to vote for a reset. If half the channel votes :yes: within the next 24 hours, the reset will happen."
      );
      channel = result.channel;
      postId = result.ts;
      let lockoutTime = new Date();
      lockoutTime.setDate(lockoutTime.getDate() + 1);

      result = await app.client.conversations.members({
        token: context.botToken,
        channel: channel,
      });
      votesNeeded = (result.members.length - 1) / 2; //minus one accounts for the bot itself
      //We might end up with a number like 10.5, but that's okay because our logic later will still require 11 votes and that's what we want

      mobVote.createMobVote(channel, postId, "reset", lockoutTime, votesNeeded);
    }
  );

  app.event("reaction_added", async ({ message, context, body, say }) => {
    // See if it's a mob vote that can still be voted on
    if (body.event.reaction === "yes") {
      const postId = body.event.item.ts;
      const channel = body.event.item.channel;

      let votePost = mobVote.getMobVote(channel, postId, "reset");
      const currentTime = new Date();
      if (
        votePost !== null &&
        !votePost.handled &&
        currentTime < new Date(votePost.lockoutTime)
      ) {
        console.log(votePost);
        const result = await app.client.reactions.get({
          token: context.botToken,
          channel: votePost.channelId,
          timestamp: votePost.postId,
        });
        yesVotes = 0;
        result.message.reactions.forEach((reaction) => {
          if (reaction.name === "yes") {
            yesVotes = reaction.count;
          }
        });

        if (yesVotes >= votePost.votesNeeded) {
          await resetChannel(votePost.channelId, app, context);
          say(
            `The people have spoken! The channel has been reset and everybody now has ${consts.defaultPoints} points.`
          );
          votePost.handled = true;
          mobVote.save();
        }
      }
    }
    console.log(context);
  });
};
