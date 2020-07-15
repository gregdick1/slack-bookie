const blockKitUtilities = require("./blockKitUtilities");

exports.getBetPostView = (bet, statusDisplay, pointsRemaining) => {

  let overflowOptions = [];
  if (statusDisplay === 'Open') {
    overflowOptions.push({
      text: {
        type: 'plain_text',
        text: 'Accept Bet',
      },
      value: 'accept_bet'
    });
  }

  overflowOptions.push({
    text: {
      type: 'plain_text',
      text: 'Submit Results',
    },
    value: 'submit_results'
  });

  overflowOptions.push({
    text: {
      type: 'plain_text',
      text: 'Cancel Bet',
    },
    value: 'cancel_bet'
  });

  const blocks = [
    blockKitUtilities.markdownSection(`<@${bet.userId}> wants to make a bet!`),
    blockKitUtilities.divider(),
  ]
  
  if (statusDisplay !== 'Finished'){
    blocks.push({
      type: 'section',
      block_id: 'bet_action',
      text: {
        type: 'mrkdwn',
        text: bet.scenarioText,
      },
      accessory: {
        type: 'overflow',
        action_id: 'bet_action_from_channel',
        options: overflowOptions
      }
    });
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
  return blocks;
}