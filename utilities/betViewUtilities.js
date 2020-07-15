const blockKitUtilities = require("./blockKitUtilities");

exports.getBetPostView = (bet, statusDisplay, pointsRemaining) => {
  const blocks = [
    blockKitUtilities.markdownSection(`<@${bet.userId}> wants to make a bet!`),
    blockKitUtilities.divider(),
  ]
  
  if (statusDisplay === 'Open') {
    blocks.push(blockKitUtilities.markdownSectionWithAccessoryButton(bet.scenarioText, "Accept Bet", "accept_bet"));
  } else {
    blocks.push(blockKitUtilities.markdownSection(bet.scenarioText));
  }
  blocks.push(blockKitUtilities.divider());

  let finishedText = '';
  if (statusDisplay === 'Finished'){
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
  if (['Open', 'Closed'].includes(statusDisplay)){
    blocks.push(blockKitUtilities.buttonAction("bet_actions", "Submit Results", "submit_results_from_channel"));
  }
  return blocks;
}