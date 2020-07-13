const betDb = require("./db/bet");
const walletDb = require("./db/wallet");

exports.setup = (app) => {
  // Listen for a slash command invocation
  app.command("/rh-bookie-test", async ({ ack, body, context }) => {
    // Acknowledge the command request
    await ack();

    // TODO: ensure betting is set up for this channel and message back if not

    try {
      const result = await app.client.views.open({
        token: context.botToken,
        // Pass a valid trigger_id within 3 seconds of receiving it
        trigger_id: body.trigger_id,
        // View payload
        view: {
          type: "modal",
          // View identifier
          callback_id: "bet_creation",
          title: {
            type: "plain_text",
            text: "Create a Bet",
          },
          private_metadata: JSON.stringify({
            channel_id: body.channel_id,
          }),
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "Let's make a bet!",
              }, //,
              // accessory: {
              //   type: 'button',
              //   text: {
              //     type: 'plain_text',
              //     text: 'Click me!'
              //   },
              //   action_id: 'button_abc'
              // }
            },
            {
              type: "input",
              block_id: "bet_scenario",
              label: {
                type: "plain_text",
                text: "I bet that...",
              },
              element: {
                type: "plain_text_input",
                action_id: "dreamy_input",
                multiline: true,
              },
            },
            {
              type: "input",
              block_id: "amount_input",
              label: {
                type: "plain_text",
                text: "How many points?",
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
  });

  app.action(
    {
      action_id: "button_abc",
    },
    async ({ body, ack }) => {
      await ack();
      console.log(body);
    }
  );

  // Handle a view_submission event
  app.view("bet_creation", async ({ ack, body, view, context }) => {
    // Acknowledge the view_submission event
    await ack();

    const val =
      view["state"]["values"]["bet_scenario"]["dreamy_input"]["value"];

    const amountInput =
      view["state"]["values"]["amount_input"]["amount_input"]["value"];
    const amount = parseInt(amountInput, 10);
    if (isNaN(amount)) {
      // TODO: what should we send back to the user?
      console.log("Invalid input amount. Bailing");
      return;
    }

    const user = body["user"]["id"];
    const md = JSON.parse(view.private_metadata);
    const channel = md.channel_id;
    const season = walletDb.getCurrentSeason(channel);

    const wallet = walletDb.getWalletForSeason(channel, user, season);

    if (!wallet) {
      // TODO message the user to get a wallet set up and/or run Let's gamble!
      console.log("No creator wallet found");
      return;
    }

    if (wallet.points < amount) {
      // TODO message back to user
      console.log("User doesn't have enough points for bet");
      return;
    }

    betDb.addBet(user, channel, wallet, val, amount);

    // Message the user
    // try {
    //   await app.client.chat.postMessage({
    //     token: context.botToken,
    //     channel: user,
    //     text: msg
    //   });
    // }
    // catch (error) {
    //   console.error(error);
    // }
  });
};
