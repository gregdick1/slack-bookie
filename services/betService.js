const walletDB = require("../db/wallet");
const betDB = require("../db/bet");
const utilities = require ("../utilities/utilities");
const betAcceptDB = require("../db/betAccept");

exports.closeBet = (betId, result) => {
  const bet = betDB.getBetById(betId);
  const betAccepts = betAcceptDB.getAllBetAcceptsForBet(betId);

  if (["yes", "no"].includes(result)) {
    bet.status = betDB.statusFinished;
    bet.outcome = result;
  } else if (["inconclusive", "cancel"].includes(result)) {
    bet.status = betDB.statusCanceled;
  }
  betDB.save(); 

  if (result === "yes") {
    //Creator is winner. They get points from the bet accepts as well as the original bet points back
    let payout = bet.pointsBet;
    betAccepts.forEach((ba) => {
      payout += ba.pointsBet;
    });
    let updatedWallet = walletDB.updateBalance(bet.walletId, payout);

    distributionMessage = `${utilities.formatSlackUserId(bet.userId)} has won the bet! They've received a payout of ${payout} points and now have ${updatedWallet.points} points in their wallet.`
  } else if (result === "no") {

    distributionMessage = `${utilities.formatSlackUserId(bet.userId)} has lost the bet! `
    //Acceptors win, they receive the payouts from their bet accepts
    betAccepts.forEach((ba) => {
      let acceptorWallet = walletDB.updateBalance(ba.walletId, ba.payout)
      distributionMessage += `${utilities.formatSlackUserId(acceptorWallet.userId)} has received a payout of ${ba.payout} points and now has ${acceptorWallet.points} points in their wallet.`
    });
  } else if (result === "cancel") {
    distributionMessage = `The bet has been called off! `

    //Everyone gets their original points back
    let creatorWallet = walletDB.updateBalance(bet.walletId, bet.pointsBet);
    distributionMessage += `${utilities.formatSlackUserId(bet.userId)} has received back their ${bet.pointsBet} points and now has ${creatorWallet.points} points in their wallet.`

    betAccepts.forEach((ba) => {
      let acceptorWallet = walletDB.updateBalance(ba.walletId, ba.pointsBet);
      distributionMessage += `${utilities.formatSlackUserId(acceptorWallet.userId)} has received back their ${ba.pointsBet} points and now has ${acceptorWallet.points} points in their wallet.`
    });
  }

  return { updatedBet: bet, distributionMessage };
};