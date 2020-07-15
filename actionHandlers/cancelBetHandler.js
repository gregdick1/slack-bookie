const betDB = require("../db/bet");
const betAcceptDB = require("../db/betAccept");
const blockKitUtility = require("../utilities/blockKitUtilities")

const handleCancel = async (app, botToken, triggerId, bet, cancellingUserId) => {
  const accepts = betAcceptDB.getAllBetAcceptsForBet(bet._id);
  let canCancel = cancellingUserId === bet.userId && accepts.length === 0;
  
  
  if (!canCancel) {
    await app.client.views.open({
      token: botToken,
      trigger_id: triggerId,
      view: {
        type: "modal",
        title: {
          type: "plain_text",
          text: "You can't cancel this bet",
        },
        blocks: [
          blockKitUtility.markdownSection("In order to cancel a bet, you must be the bet creator and no one else can have accepted the bet")
        ]
      },
      submit: {
        type: "plain_text",
        text: "Okay"
      }
    });
  } else {

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
