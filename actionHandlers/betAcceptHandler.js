const walletDb = require("../db/wallet");
const betDb = require("../db/bet");
const betAcceptDb = require("../db/betAccept");

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
              wallet: wallet,
            }),
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `<@${bet.slackId}> has bet that...`,
                },
              },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: bet.scenarioText,
                },
              },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `You currently have ${
                    wallet.points
                  } pts. This bet is for ${
                    bet.pointsBet
                  } pts. You can accept this bet for any amount up to ${Math.min(
                    wallet.points,
                    bet.pointsBet
                  )} pts.`,
                },
              },
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
        console.log(result);
      } catch (error) {
        console.error(error);
      }
    }
  );

  // Handle a view_submission event
  app.view("bet_acception", async ({ ack, body, view, context }) => {
    // Acknowledge the view_submission event
    await ack();

    const user = body.user.id;

    const amountInput =
      view["state"]["values"]["amount_input"]["amount_input"]["value"];
    const amount = parseInt(amountInput, 10);
    if (isNaN(amount)) {
      // TODO: what should we send back to the user?
      console.log("Invalid input amount. Bailing");
      return;
    }

    const md = JSON.parse(view.private_metadata);
    const bet = md.bet;
    const wallet = md.wallet;
    const channel = bet.channelId;

    if (wallet.points < amount) {
      // TODO message back to user?
      console.log("User doesn't have enough points for bet");
      return;
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
  });
};
