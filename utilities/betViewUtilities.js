const blockKitUtilities = require("./blockKitUtilities");
const utilities = require('./utilities');
const betDB = require("../db/bet");

exports.statusOpenDisplay = 'Open';
exports.statusClosedDisplay = 'Closed';
exports.statusFinishedDisplay = 'Finished';
exports.statusCanceledDisplay = 'Canceled';

exports.getBetPostView = (bet, statusDisplay, pointsRemaining) => {

  let overflowOptions = [];
  if (statusDisplay === this.statusOpenDisplay) {
    overflowOptions.push(blockKitUtilities.overflowOption('Accept Bet', 'accept_bet'));
  }
  overflowOptions.push(blockKitUtilities.overflowOption('Submit Results', 'submit_results'));
  overflowOptions.push(blockKitUtilities.overflowOption('Cancel Bet', 'cancel_bet'));

  const blocks = [
    blockKitUtilities.markdownSection(`${utilities.formatSlackUserId(bet.userId)} wants to make a bet!`),
    blockKitUtilities.divider(),
  ]

  if (statusDisplay !== this.statusFinishedDisplay) {
    const sectionWithOverflow = blockKitUtilities.markdownSectionWithOverflow(bet.scenarioText, 'bet_action', 'bet_action_from_channel', overflowOptions);
    blocks.push(sectionWithOverflow);
  } else {
    blocks.push(blockKitUtilities.markdownSection(bet.scenarioText));
  }

  blocks.push(blockKitUtilities.divider());

  let finishedText = '';
  if (statusDisplay === this.statusFinishedDisplay) {
    finishedText = ' *Result:* Implement Me'
  }

  blocks.push({
    type: 'context',
    elements: [
      {
        type: "mrkdwn",
        text: `*Status:* ${statusDisplay}  *Amount:* ${bet.pointsBet} pts  *Remaining:* ${pointsRemaining} pts ${finishedText}`,
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

exports.formatBetStatus = (status) => {
  return this.betStatusEmoji(status) + ' ' + status;
}