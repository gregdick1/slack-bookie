const betDB = require("../db/bet");
const betAcceptDB = require("../db/betAccept");
const blockKitUtilities = require("../utilities/blockKitUtilities");
const betService = require("../services/betService");
const utilities = require("../utilities/utilities");
const betViewUtilities = require("../utilities/betViewUtilities");

const handleCancel = async (app, botToken, triggerId, bet, cancellingUserId) => {
  const accepts = betAcceptDB.getAllBetAcceptsForBet(bet._id);

  if (cancellingUserId !== bet.userId) {
    const modalViewBlocks = [
      blockKitUtilities.markdownSection("You're not able to cancel this bet since you're not bet owner!")
    ];
    modalView = blockKitUtilities.modalView("cannot_cancel", "Can't Cancel Bet", null, modalViewBlocks, "", false);
    await app.client.views.open({
      token: botToken,
      trigger_id: triggerId,
      view: modalView
    });
  } else if (accepts.length !== 0){
    const modalViewBlocks = [
      blockKitUtilities.markdownSection("Someone has already accepted this bet so it can't be cancelled. Please have both sides submit an *Inconclusive* result for the bet instead.")
    ];
    modalView = blockKitUtilities.modalView("cannot_cancel", "Can't Cancel Bet", null, modalViewBlocks, "", false);
    await app.client.views.open({
      token: botToken,
      trigger_id: triggerId,
      view: modalView
    });
  } else {
    const modalViewBlocks = [
      blockKitUtilities.markdownSection("Are you sure you want to cancel this bet? Cancelling will return all the points you bet to your wallet.")
    ];
    // callbackId, titleText, privateMetadata, bkBlocks, submitText, submittable
    modalView = blockKitUtilities.modalView("cancel_bet", "Cancel Bet", { bet }, modalViewBlocks, "Cancel Bet", true);
    await app.client.views.open({
      token: botToken,
      trigger_id: triggerId,
      view: modalView
    });
  }
}


exports.handleCancelFromHome = async (app, body, context) => {
  // TODO: implement
};


exports.handleCancelFromBetAction = async (app, body, context) => {
  const cancellingUser = body.user.id;
  const postId = body.message.ts;
  const channel = body.channel.id;
  const bet = betDB.getBetByPostId(channel, postId);

  await handleCancel(app, context.botToken, body.trigger_id, bet, cancellingUser);
};

exports.setup = (app) => {
  app.view("cancel_bet", async ({ ack, body, view, context }) => {
    await ack();

    const user = body.user.id;
    const md = JSON.parse(view.private_metadata);
    const channel = md.bet.channelId;

    const updatedBet = betService.closeBet(md.bet._id, "cancel");
    const closeMessage = `${utilities.formatSlackUserId(user)} has cancelled this bet.`
    await app.client.chat.postMessage({
      token: context.botToken,
      channel: channel,
      thread_ts: md.bet.postId,
      text: closeMessage,
    });

    await app.client.chat.update({
      token: context.botToken,
      channel: channel,
      ts: md.bet.postId,
      blocks: betViewUtilities.getBetPostView(updatedBet, betDB.statusCanceled, 0),
    });
  });
}
