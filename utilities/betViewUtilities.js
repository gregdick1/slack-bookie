const blockKitUtilities = require("./blockKitUtilities");
const utilities = require('./utilities');
const betDB = require("../db/bet");

exports.getBetPostView = (bet, statusDisplay, pointsRemaining) => {
  const blocks = [
    blockKitUtilities.markdownSection(`${utilities.formatSlackUserId(bet.userId)} wants to make a bet!`),
    blockKitUtilities.divider(),
  ]

  if (statusDisplay === betDB.statusOpen) {
    blocks.push(blockKitUtilities.markdownSectionWithAccessoryButton(bet.scenarioText, "Accept Bet", "accept_bet"));
  } else {
    blocks.push(blockKitUtilities.markdownSection(bet.scenarioText));
  }
  blocks.push(blockKitUtilities.divider());

  let finishedText = '';
  if (statusDisplay === betDB.statusFinished) {
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
  const submittableStatuses = [betDB.statusOpen, betDB.statusClosed];
  if (submittableStatuses.includes(statusDisplay)) {
    blocks.push(blockKitUtilities.buttonAction("bet_actions", "Submit Results", "submit_results_from_channel"));
  }
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