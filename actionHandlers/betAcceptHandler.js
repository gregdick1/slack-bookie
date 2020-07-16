const walletDB = require("../db/wallet");
const betDB = require("../db/bet");
const betAcceptDB = require("../db/betAccept");
const blockKitUtilities = require("../utilities/blockKitUtilities");
const betViewUtilities = require("../utilities/betViewUtilities");
const utilities = require('../utilities/utilities');

exports.handleBetAccept = async (app, body, context) => {
  try {
    const postId = body.message.ts;
    const channel = body.channel.id;
    const bet = betDB.getBetByPostId(channel, postId);
    const existingAccepts = betAcceptDB.getAllBetAcceptsForBet(bet._id);
    const canTake = Math.trunc(bet.odds.numerator * bet.pointsBet / bet.odds.denominator)
    const currentKitty = existingAccepts.reduce(
      (current, next) => current + next.pointsBet,
      0
    );
    const remainingBet = canTake - currentKitty;

    const wallet = walletDB.getWallet(channel, body.user.id);

    let modalView = {}
    if (body.user.id === bet.userId) {
      const modalViewBlocks = [
        blockKitUtilities.markdownSection(`${utilities.formatSlackUserId(bet.userId)} has bet that...`),
        blockKitUtilities.markdownSection(bet.scenarioText),
        blockKitUtilities.divider(),
        blockKitUtilities.markdownSection("You can't accept a bet you created. Get outta here!"),
      ];
      modalView = blockKitUtilities.modalView("bet_acception", "Accept this Bet", null, modalViewBlocks, "", false);
    } else {
      const modalViewBlocks = [
        blockKitUtilities.markdownSection(`${utilities.formatSlackUserId(bet.userId)} has bet that...`),
        blockKitUtilities.markdownSection(bet.scenarioText),
        blockKitUtilities.markdownSection(`You currently have ${
          wallet.points
          } pts. This bet has ${remainingBet} points remaining at odds of ${bet.odds.denominator}:${bet.odds.numerator}. You can accept this bet for any amount up to ${Math.min(
            remainingBet,
            wallet.points
          )} points in multiples of ${bet.odds.numerator}.`),
        blockKitUtilities.textInput("amount_input", "How many points would you like to bet?", "amount_input"),
      ];
      modalView = blockKitUtilities.modalView("bet_acception", "Accept this Bet", {
        bet: bet,
        kitty: currentKitty,
        wallet: wallet,
      }, modalViewBlocks, "Submit", true);
    }
    
    const result = await app.client.views.open({
      token: context.botToken,
      // Pass a valid trigger_id within 3 seconds of receiving it
      trigger_id: body.trigger_id,
      // View payload
      view: modalView,
    });
  } catch (error) {
    console.error(error);
  }
}

exports.setup = (app) => {
  // Handle a view_submission event
  app.view("bet_acception", async ({ ack, body, view, context }) => {
    const user = body.user.id;

    const amountInput =
      view["state"]["values"]["amount_input"]["amount_input"]["value"];
    const amount = parseInt(amountInput, 10);

    const md = JSON.parse(view.private_metadata);
    const bet = md.bet;
    const wallet = md.wallet;
    const canTake = Math.trunc(bet.odds.numerator * bet.pointsBet / bet.odds.denominator)
    const remainingBet = canTake - md.kitty;
    const channel = bet.channelId;

    let errors = undefined;

    if (isNaN(amount)) {
      errors = {
        amount_input: "Please input a valid number of points",
      };
    } else if (wallet.points < amount) {
      errors = {
        amount_input: `You only have ${wallet.points} points in your wallet!`,
      };
    } else if (remainingBet < amount) {
      errors = {
        amount_input: `This bet only has ${remainingBet} points remaining. You can't wager ${amount} points!`,
      };
    } else if (amount < bet.odds.numerator || amount % bet.odds.numerator !== 0) {
      // Remember... odds in code are stored for the creator, so for the acceptor "numerator" is 
      // the second number they see.
      errors = {
        amount_input: `With odds of ${bet.odds.denominator}:${bet.odds.numerator}, your bet must be a multiple of ${bet.odds.numerator}.`
      }
    }

    if (errors !== undefined) {
      await ack({
        response_action: "errors",
        errors,
      });
      return;
    } else {
      await ack();
    }

    //Handle the race condition. Get the bet from the db again and check to make sure there's enough remaining points
    let freshBet = betDB.getBetById(bet._id);
    let freshAccepts = betAcceptDB.getAllBetAcceptsForBet(freshBet._id);
    let freshCanTake = Math.trunc(bet.odds.numerator * freshBet.pointsBet / freshBet.odds.denominator)
    let freshKitty = freshAccepts.reduce((current, next) => current + next.pointsBet, 0);
    let freshRemainingBet = freshCanTake - freshKitty;
    if (freshRemainingBet < amount) {
      //We have hit the race condition where somebody else accepted and beat them to the punch. We need to DM the user and let them know
      await app.client.chat.postMessage({
        token: context.botToken,
        channel: user,
        text: "It looks like somebody else accepted the bet before you were able to submit. I wasn't able to process it. If the bet is still open, you can try again."
      });
      return;
    }

    let payout = amount + Math.trunc(bet.odds.denominator * amount / bet.odds.numerator);

    betAcceptDB.addBetAccept(
      bet._id,
      user,
      channel,
      wallet._id,
      amount,
      payout
    );
    walletDB.updateBalance(wallet._id, -amount);

    //threaded reply to the bet post
    const acceptMessage = `${utilities.formatSlackUserId(user)} has accepted this bet for ${amount} points and a potential payout of ${payout} points! They have ${wallet.points - amount} points left in their wallet.`
    const result = await app.client.chat.postMessage({
      token: context.botToken,
      channel: channel,
      thread_ts: bet.postId,
      text: acceptMessage,
    });

    const totalPaid = md.kitty + amount;

    let status = betDB.statusOpen;
    if (totalPaid == canTake) {
      betDB.setBetStatus(bet._id, betDB.statusClosed);
      status = betDB.statusClosed;
    }

    await app.client.chat.update({
      token: context.botToken,
      channel: channel,
      ts: bet.postId,
      blocks: betViewUtilities.getBetPostView(bet, status, remainingBet - amount),
    });
  });
};
