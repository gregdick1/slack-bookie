const walletDb = require("../db/wallet");
const betDb = require("../db/bet");
const betAcceptDb = require("../db/betAccept");
const blockKitUtilities = require("../utilities/blockKitUtilities");

exports.setup = (app) => {
  app.action(
    {
      action_id: "accept_bet",
    },
    async ({ body, ack, context }) => {
      await ack();
      try {
        const postId = body.message.ts;
        const channel = body.channel.id;
        const bet = betDb.getBetByPostId(channel, postId);
        const existingAccepts = betAcceptDb.getAllBetAcceptsForBet(bet._id);
        const currentKitty = existingAccepts.reduce(
          (current, next) => current + next.pointsBet,
          0
        );
        const remainingBet = bet.pointsBet - currentKitty;

        const wallet = walletDb.getWallet(channel, body.user.id);
        const result = await app.client.views.open({
          token: context.botToken,
          // Pass a valid trigger_id within 3 seconds of receiving it
          trigger_id: body.trigger_id,
          // View payload
          view: {
            type: "modal",
            // View identifier
            callback_id: "bet_acception",
            title: {
              type: "plain_text",
              text: "Accept this Bet",
            },
            private_metadata: JSON.stringify({
              bet: bet,
              kitty: currentKitty,
              wallet: wallet,
            }),
            blocks: [blockKitUtilities.markdownSection(`<@${bet.slackId}> has bet that...`),
              blockKitUtilities.markdownSection(bet.scenarioText),
              blockKitUtilities.markdownSection(`You currently have ${
                    wallet.points
                  } pts. This bet has ${remainingBet} pts remaining. You can accept this bet for any amount up to ${Math.min(
                    remainingBet,
                    wallet.points
                  )} pts.`),
              {
                type: "input",
                block_id: "amount_input",
                label: {
                  type: "plain_text",
                  text: "How many points would you like to bet?",
                },
                element: {
                  type: "plain_text_input",
                  action_id: "amount_input",
                },
              },
            ],
            submit: {
              type: "plain_text",
              text: "Submit",
            },
          },
        });
      } catch (error) {
        console.error(error);
      }
    }
  );

  // Handle a view_submission event
  app.view("bet_acception", async ({ ack, body, view, context }) => {
    const user = body.user.id;

    const amountInput =
      view["state"]["values"]["amount_input"]["amount_input"]["value"];
    const amount = parseInt(amountInput, 10);

    const md = JSON.parse(view.private_metadata);
    const bet = md.bet;
    const wallet = md.wallet;
    const remainingBet = bet.pointsBet - md.kitty;
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
      text: `<@${user}> has accepted this bet!`,
    });

    //TODO implement odds. Currently always 1:1
    let payout = amount * 2;

    betAcceptDb.addBetAccept(
      bet._id,
      user,
      channel,
      wallet._id,
      amount,
      payout
    );
    walletDb.updateBalance(wallet._id, -amount);

    const totalPaid = md.kitty + amount;
    if (totalPaid == bet.pointsBet) {
      betDb.setBetStatus(bet._id, betDb.statusClosed);
      console.log("Bet is closed! Wahoo!");
    }
  });
};
