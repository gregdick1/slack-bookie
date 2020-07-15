const mobVoteDB = require("../db/mobVote");
const walletDB = require("../db/wallet");
const consts = require("../consts");
const blockKitUtilities = require ("../utilities/blockKitUtilities");
const submitResultsHandler = require("./submitResultsHandler");

exports.handleDispute = async (app, body, context, bet) => {
  if (!bet.result_submissions || bet.result_submissions.length < 2) {
    return;
  }

  let submissionText = bet.result_submissions.map((rs) => {
    return `<@${rs.userId}> said the result was ${submitResultsHandler.getResultDisplay(rs.result)}`
  }).join(', ');

  let result = await app.client.conversations.members({
    token: context.botToken,
    channel: bet.channelId,
  });
  votesNeeded = (result.members.length - 1) / 3; //minus one accounts for the bot itself

  result = await app.client.chat.postMessage({
    token: context.botToken,
    channel: bet.channelId,
    blocks: [
      blockKitUtilities.markdownSection('We have a dispute that needs settled!'),
      blockKitUtilities.markdownSection(`<@${bet.userId}> has bet that...`),
      blockKitUtilities.divider(),
      blockKitUtilities.markdownSection(bet.scenarioText),
      blockKitUtilities.divider(),
      blockKitUtilities.markdownSection(submissionText),
      blockKitUtilities.markdownSection(`React with your vote of :yes:, :no:, or :notsureif: for inconclusive. First choice to receive ${votesNeeded} votes in the next 24 hours will win.`)
    ],
  });

  postId = result.ts;
  let lockoutTime = new Date();
  lockoutTime.setDate(lockoutTime.getDate() + 1);
  mobVoteDB.createMobVote(bet.channelId, postId, 'dispute', lockoutTime, votesNeeded);
  //TODO do this better
  let mobVote = mobVoteDB.getMobVote(bet.channelId, postId);
  mobVote.betId = bet._id;
  mobVoteDB.save();
}

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

    mobVoteDB.createMobVote(channel, postId, type, lockoutTime, votesNeeded);
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

    const currentSeason = walletDB.getCurrentSeason(channel);
    result.members.forEach((item, index) => {
      if (item === consts.botId) {
        return;
      }
      walletDB.addWallet(channel, item, consts.defaultPoints, currentSeason + 1);
    });

    say(`The people have spoken! The channel has been reset and everybody now has ${consts.defaultPoints} points.`);
    //TODO show leaderboard from last season
  };

  const giveMorePoints = async (channel, say) => {
    let wallets = walletDB.getAllWalletsForSeason(channel, walletDB.getCurrentSeason(channel), false)
    wallets.forEach((w) => {
      w.points += consts.defaultPoints;
    });
    walletDB.save();
    say(`The people have spoken! Everybody in the channel has been given an extra ${consts.defaultPoints} points.`);
  }

  app.event("reaction_added", async ({
    message,
    context,
    body,
    say
  }) => {
    // See if it's a mob vote that can still be voted on
    const voteReactions = {
      yes: 0,
      no: 0,
      notsureif: 0
    };
    const acceptableVotes = Object.keys(voteReactions);
    if (acceptableVotes.includes(body.event.reaction)) {
      const postId = body.event.item.ts;
      const channel = body.event.item.channel;

      let votePost = mobVoteDB.getMobVote(channel, postId);
      const currentTime = new Date();
      if (votePost !== null && !votePost.handled && currentTime < new Date(votePost.lockoutTime)) {
        const result = await app.client.reactions.get({
          token: context.botToken,
          channel: votePost.channelId,
          timestamp: votePost.postId,
        });
        yesVotes = 0;
        result.message.reactions.forEach((reaction) => {
          if (acceptableVotes.includes(reaction.name)) {
            voteReactions[reaction.name] += reaction.count;
          }
        });

        if (votePost.type === 'reset' && voteReactions['yes'] >= votePost.votesNeeded) {
          await resetChannel(votePost.channelId, context, say);
          votePost.handled = true;
          mobVoteDB.save();
        }
        if (votePost.type === 'points' && voteReactions['yes'] >= votePost.votesNeeded) {
          await giveMorePoints(votePost.channelId, say);
          votePost.handled = true;
          mobVoteDB.save();
        }
        if (votePost.type === 'dispute') {
          for (let v of acceptableVotes) {
            if (voteReactions[v] >= votePost.votesNeeded) {
              let result = v;
              if (result === 'notsureif'){
                result = 'cancel';
              }

              await submitResultsHandler.handleDisputeVoteResult(app, body, context, votePost.betId, result);
              votePost.handled = true;
              mobVoteDB.save();
              break;
            }
          }
        }
      }
    }
  });
};