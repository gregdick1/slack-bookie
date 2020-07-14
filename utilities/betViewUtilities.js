const blockKitUtilities = require("./blockKitUtilities");

exports.getBetPostView = (bet, statusDisplay, pointsRemaining) => {
  const blocks = [
    blockKitUtilities.markdownSection(`<@${bet.slackId}> wants to make a bet!`),
    blockKitUtilities.divider(),
    blockKitUtilities.markdownSection(bet.scenarioText),
    blockKitUtilities.divider()
  ]
  if (statusDisplay === 'Open') {
    blocks.push(blockKitUtilities.markdownSectionWithAccessoryButton(`*Status:* Open\n *Amount:* ${bet.pointsBet} pts\n*Remaining:* ${pointsRemaining} pts`, "Accept Bet", "accept_bet"));
  } else {
    blocks.push(blockKitUtilities.markdownSection(`*Status:* ${statusDisplay}\n *Amount:* ${bet.pointsBet} pts\n*Remaining:* ${pointsRemaining} pts`));
  }
  blocks.push(blockKitUtilities.buttonAction("bet_actions", "Submit Results", "submit_results_from_channel"));
  return blocks;
}