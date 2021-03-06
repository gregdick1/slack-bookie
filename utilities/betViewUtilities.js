const blockKitUtilities = require("./blockKitUtilities");
const utilities = require('./utilities');
const betDB = require("../db/bet");
const betAcceptDB = require("../db/betAccept");

exports.getBetPostView = (bet, status, pointsRemaining) => {
  let overflowOptions = [];
  if (status === betDB.statusOpen) {
    overflowOptions.push(blockKitUtilities.option('Accept Bet', 'accept_bet'));
  }
  if (betAcceptDB.getAllBetAcceptsForBet(bet._id).length > 0) {
    overflowOptions.push(blockKitUtilities.option('Submit Results', 'submit_results'));
  }
  overflowOptions.push(blockKitUtilities.option('Cancel Bet', 'cancel_bet'));

  const blocks = [
    blockKitUtilities.markdownSection(`${utilities.formatSlackUserId(bet.userId)} wants to make a bet!`),
    blockKitUtilities.divider(),
  ]

  if ([betDB.statusOpen, betDB.statusClosed].includes(status)) {
    const sectionWithOverflow = blockKitUtilities.markdownSectionWithOverflow(bet.scenarioText, 'bet_action', 'bet_action_from_channel', overflowOptions);
    blocks.push(sectionWithOverflow);
  } else {
    blocks.push(blockKitUtilities.markdownSection(bet.scenarioText));
  }

  blocks.push(blockKitUtilities.divider());

  let finishedText = '';
  if (status === betDB.statusFinished) {
    finishedText = blockKitUtilities.formatField("Result", this.betOutcomeDisplay(bet.outcome));
  }

  const statusField = blockKitUtilities.formatField("Status", this.formatBetStatus(status));
  const oddsField = blockKitUtilities.formatField("Odds", `${bet.odds.denominator}:${bet.odds.numerator}`);
  const amount = blockKitUtilities.formatField("Amount", bet.pointsBet + " pts");
  const remaining = blockKitUtilities.formatField("Remaining", pointsRemaining + " pts");
  const bottomLine = blockKitUtilities.markdownElement(`${statusField}  ${oddsField}  ${amount}  ${remaining}  ${finishedText}`);
  blocks.push(blockKitUtilities.context([bottomLine]));
  return blocks;
}

exports.displayOdds = (betOdds) => {
  if (!betOdds) {
    return 'No odds for this bet';
  }
  return `${betOdds.denominator}:${betOdds.numerator}`;
};

exports.betStatusEmoji = (status) => {
  if (status === betDB.statusCanceled) {
    return ':cancel:';
  } else if (status === betDB.statusClosed) {
    return ':closed_book:';
  } else if (status === betDB.statusFinished) {
    return ':done1:';
  }
  return ':in-progress:';
}

exports.betStatusDisplay = (status) => {
  if (status === betDB.statusCanceled) {
    return 'Canceled';
  } else if (status === betDB.statusClosed) {
    return 'Closed';
  } else if (status === betDB.statusFinished) {
    return 'Finished';
  }
  return 'Open';
}

exports.formatBetStatus = (status) => {
  return this.betStatusEmoji(status) + ' ' + this.betStatusDisplay(status);
}

exports.betOutcomeDisplay = (outcome, flipPerspective) => {
  if (flipPerspective === undefined) {
    flipPerspective = false;
  }
  if (outcome === betDB.outcomeCreatorWon) {
    return flipPerspective ? "Lost" : "Won";
  } else if (outcome === betDB.outcomeCreatorLost) {
    return flipPerspective ? "Won" : "Lost";
  }
  return "??";
}