const mobVoteDb = require("../db/mobVote");
const walletDb = require("../db/wallet");
const consts = require("../consts");

exports.setup = (app) => {

  const startMobVote = async (say, context, message, type) => {
    let result = await say(message);
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

    mobVoteDb.createMobVote(channel, postId, type, lockoutTime, votesNeeded);
  }

  // Listen for a slash command invocation
  app.command(
    `/${consts.commandPrefix}bookie-channel-reset`,
    async ({
      ack,
      body,
      context,
      say
    }) => {
      // Acknowledge the command request
      await ack();

      let message = "A vote to reset the bookie wallets in this channel has been initiated! React with :yes: to vote for a reset. If half the channel votes :yes: within the next 24 hours, the reset will happen.";
      await startMobVote(say, context, message, 'reset');
    }
  );

  app.command(
    `/${consts.commandPrefix}bookie-more-points`,
    async ({
      ack,
      body,
      context,
      say
    }) => {
      // Acknowledge the command request
      await ack();

      message = `A vote to give everyone an additional ${consts.defaultPoints} has been initiated! React with :yes: to vote for more points. If half the channel votes :yes: within the next 24 hours, the points will be given.`;
      await startMobVote(say, context, message, 'points');
    }
  );

  const resetChannel = async (channel, context, say) => {
    const result = await app.client.conversations.members({
      token: context.botToken,
      channel: channel,
    });
  
    const currentSeason = walletDb.getCurrentSeason(channel);
    result.members.forEach((item, index) => {
      if (item === consts.botId) {
        return;
      }
      walletDb.addWallet(channel, item, consts.defaultPoints, currentSeason + 1);
    });

    say(`The people have spoken! The channel has been reset and everybody now has ${consts.defaultPoints} points.`);
    //TODO show leaderboard from last season
  };

  const giveMorePoints = async (channel, say) => {
    let wallets = walletDb.getAllWalletsForSeason(channel, walletDb.getCurrentSeason(channel), false)
    wallets.forEach((w) => {
      w.points += consts.defaultPoints;
    });
    walletDb.save();
    say(`The people have spoken! Everybody in the channel has been given an extra ${consts.defaultPoints} points.`);
  }

  app.event("reaction_added", async ({
    message,
    context,
    body,
    say
  }) => {
    // See if it's a mob vote that can still be voted on
    if (body.event.reaction === "yes") {
      const postId = body.event.item.ts;
      const channel = body.event.item.channel;

      let votePost = mobVoteDb.getMobVote(channel, postId);
      const currentTime = new Date();
      if (votePost !== null && !votePost.handled && currentTime < new Date(votePost.lockoutTime)) {
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
          if (votePost.type === 'reset') {
            await resetChannel(votePost.channelId, context, say);
          } else if (votePost.type === 'points') {
            await giveMorePoints(votePost.channelId, say);
          } else if (votePost.type === 'dispute') {
            //TODO
          }
          votePost.handled = true;
          mobVoteDb.save();
        }
      }
    }
  });
};