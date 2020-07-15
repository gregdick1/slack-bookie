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

    const modalViewBlocks = [blockKitUtilities.markdownSection(`${utilities.formatSlackUserId(bet.userId)} has bet that...`),
    blockKitUtilities.markdownSection(bet.scenarioText),
    blockKitUtilities.markdownSection(`You currently have ${
      wallet.points
      } pts. This bet has ${remainingBet} pts remaining. You can accept this bet for any amount up to ${Math.min(
        remainingBet,
        wallet.points
      )} pts.`),
    blockKitUtilities.input("amount_input", "How many points would you like to bet?", "amount_input"),
    ];
    const modalView = blockKitUtilities.modalView("bet_acception", "Accept this Bet", {
      bet: bet,
      kitty: currentKitty,
      wallet: wallet,
    }, modalViewBlocks, "Submit");
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

    //threaded reply to the bet post
    const result = await app.client.chat.postMessage({
      token: context.botToken,
      channel: channel,
      thread_ts: bet.postId,
      text: `${utilities.formatSlackUserId(user)} has accepted this bet!`,
    });

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
