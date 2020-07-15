const blockKitUtilities = require("./blockKitUtilities");
const utilities = require('./utilities');
const betDB = require("../db/bet");

exports.getBetPostView = (bet, status, pointsRemaining) => {
  let overflowOptions = [];
  if (status === betDB.statusOpen) {
    overflowOptions.push(blockKitUtilities.overflowOption('Accept Bet', 'accept_bet'));
  }
  overflowOptions.push(blockKitUtilities.overflowOption('Submit Results', 'submit_results'));
  overflowOptions.push(blockKitUtilities.overflowOption('Cancel Bet', 'cancel_bet'));

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
    finishedText = ' *Result:* Implement Me'
  }
  
  blocks.push({
    type: 'context',
    elements: [
      {
        type: "mrkdwn",
        text: `*Status:* ${this.formatBetStatus(status)}  *Odds:* ${bet.odds.numerator}:${bet.odds.denominator}  *Amount:* ${bet.pointsBet} pts  *Remaining:* ${pointsRemaining} pts ${finishedText}`,
      },
    ]
  });
  return blocks;
}

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