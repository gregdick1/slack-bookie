const mobVote = require("../db/mobVote");

exports.setup = (app, botId) => {
  // Listen for a slash command invocation
  app.command("/bookie-channel-reset", async ({ ack, body, context, say }) => {
    // Acknowledge the command request
    await ack();

    let result = await say(
      "A vote to reset the bookie wallets in this channel has been initiated. React with :yes: to vote for a reset."
    );
    channel = result.channel;
    postId = result.ts;
    let lockoutTime = new Date();
    lockoutTime.setDate(lockoutTime.getDate() + 1);

    mobVote.createMobVote(channel, postId, "reset", lockoutTime, 3); //TODO proper number of votes needed
  });

  app.event("reaction_added", async ({ message, context, body }) => {
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
          //TODO Do the thing

          votePost.handled = true;
          mobVote.save();
        }
      }
    }
    console.log(context);
  });
};
