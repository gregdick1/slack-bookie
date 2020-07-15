const walletDB = require("../db/wallet");
const betDB = require("../db/bet");

exports.closeBet = (bet, betAccepts, result) => {
  if (["yes", "no"].includes(result)) {
    bet.status = betDB.statusFinished;
    bet.outcome = result;
  } else if (result === "inconclusive") {
    bet.status = betDB.statusCanceled;
  }
  betDB.save();

  if (result === "yes") {
    //Creator is winner. They get points from the bet accepts as well as the original bet points back
    let creatorWallet = walletDB.getWalletById(bet.walletId);
    creatorWallet.points += bet.pointsBet;
    betAccepts.forEach((ba) => {
      creatorWallet.points += ba.pointsBet;
    });
    walletDB.save();
  } else if (result === "no") {
    //Acceptors win, they receive the payouts from their bet accepts
    betAccepts.forEach((ba) => {
      let acceptorWallet = walletDB.getWalletById(ba.walletId);
      acceptorWallet.points += ba.payout;
    });
    walletDB.save();
  } else if (result === "cancel") {
    //Everyone gets their original points back
    let creatorWallet = walletDB.getWalletById(bet.walletId);
    creatorWallet.points += bet.pointsBet;

    betAccepts.forEach((ba) => {
      let acceptorWallet = walletDB.getWalletById(ba.walletId);
      acceptorWallet.points += ba.pointsBet;
    });
    walletDB.save();
  }
};