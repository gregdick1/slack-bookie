const betDb = require("./db/bet");
const walletDb = require("./db/wallet");
const consts = require("./consts");
const blockKitUtilities = require('./utilities/blockKitUtilities');

exports.setup = (app) => {
  // Listen for a slash command invocation
  app.command(
    `/${consts.commandPrefix}bookie-test`,
    async ({
      ack,
      body,
      context,
      say
    }) => {
      // Acknowledge the command request
      await ack();

      const user = body.user_id;
      const channel = body.channel_id;
      const season = walletDb.getCurrentSeason(channel);
      const wallet = walletDb.getWalletForSeason(channel, user, season);
      if (!wallet) {
        say(
          `<@${user}> wants to make a bet, but they don't have a wallet! Is this channel set up for gambling? If not, someone should say \`@Bookie Let's gamble!\``
        );
        return;
      }

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
              wallet: wallet,
            }),
            blocks: [blockKitUtilities.markdownSection("Let's make a bet!"),
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
      } catch (error) {
        console.error(error);
      }
    }
  );

  // Handle a view_submission event
  app.view("bet_creation", async ({
    ack,
    body,
    view,
    context
  }) => {
    // Acknowledge the view_submission event
    await ack();

    const user = body.user.id;
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

    const md = JSON.parse(view.private_metadata);
    const wallet = md.wallet;
    const channel = wallet.channelId;

    if (wallet.points < amount) {
      // TODO message back to user?
      console.log("User doesn't have enough points for bet");
      return;
    }
    const result = await app.client.chat.postMessage({
      token: context.botToken,
      channel: channel,
      blocks: [
        blockKitUtilities.markdownSection(`<@${user}> wants to make a bet!`),
        blockKitUtilities.markdownSection(val),
        blockKitUtilities.markdownSectionWithAccessoryButton(`${amount} pts`, "Accept Bet", "accept_bet"),
        blockKitUtilities.buttonAction("bet_actions", "Submit Results", "submit_results_from_channel")
      ],
    });
    const postId = result.ts;
    betDb.addBet(user, channel, wallet._id, val, amount, postId);
  });
};