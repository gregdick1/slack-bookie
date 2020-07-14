const betDB = require("../db/bet");
const walletDB = require("../db/wallet");
const consts = require("../consts");

exports.setupBets = (app) => {
  // Listen for a slash command invocation
  app.command(
    `/${consts.commandPrefix}bookie-test`,
    async ({ ack, body, context, say }) => {
      // Acknowledge the command request
      await ack();

      const user = body.user_id;
      const channel = body.channel_id;
      const season = walletDB.getCurrentSeason(channel);
      const wallet = walletDB.getWalletForSeason(channel, user, season);
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
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: "Let's make a bet!",
                },
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
    }
  );

  // Handle a view_submission event
  app.view("bet_creation", async ({ ack, body, view, context }) => {
    const user = body.user.id;
    const val =
      view["state"]["values"]["bet_scenario"]["dreamy_input"]["value"];

    const amountInput =
      view["state"]["values"]["amount_input"]["amount_input"]["value"];
    const amount = parseInt(amountInput, 10);
    const md = JSON.parse(view.private_metadata);
    const wallet = md.wallet;

    let errors = undefined;

    if (isNaN(amount)) {
      errors = {
        amount_input: "Please input a valid number of points",
      };
    } else if (wallet.points < amount) {
      errors = {
        amount_input: `You only have ${wallet.points} points in your wallet!`,
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

    const channel = wallet.channelId;

    const result = await app.client.chat.postMessage({
      token: context.botToken,
      channel: channel,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `<@${user}> wants to make a bet!`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: val,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `${amount} pts`,
          },
          accessory: {
            type: "button",
            text: {
              type: "plain_text",
              text: "Accept Bet",
            },
            action_id: "accept_bet",
          },
        },
        {
          type: "actions",
          block_id: "bet_actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Submit Results",
              },
              action_id: "submit_results_from_channel",
            },
          ],
        },
      ],
    });

    const postId = result.ts;
    betDB.addBet(user, channel, wallet._id, val, amount, postId);
  });
};

exports.setup = (app) => {
  app.action(
    {
      action_id: "set_me_up_fam",
    },
    async ({ body, ack }) => {
      await ack();
      const action = body.actions[0];
      const channelId = action.block_id;

      let season = walletDB.getCurrentSeason(channelId);
      const newWallet = walletDB.addWallet(
        channelId,
        body.user.id,
        consts.defaultPoints,
        season
      );
      betDB.addBet(
        body.user.id,
        channelId,
        newWallet._id,
        "scenario text here",
        1,
        "post1"
      );
      betDB.addBet(
        body.user.id,
        channelId,
        newWallet._id,
        "scenario text here2",
        2,
        "post2"
      );
      betDB.addBet(
        body.user.id,
        channelId,
        newWallet._id,
        "scenario text here3",
        3,
        "post3"
      );
      betDB.addBet(
        body.user.id,
        channelId,
        newWallet._id,
        "scenario text here4",
        4,
        "post4"
      );
      betDB.addBet(
        body.user.id,
        channelId,
        newWallet._id,
        "scenario text here5",
        5,
        "post5"
      );
      betDB.addBet(
        body.user.id,
        channelId,
        newWallet._id,
        "scenario text here6",
        6,
        "post6"
      );

      // do things
    }
  );
  app.action(
    {
      action_id: "retire_wallet",
    },
    async ({ body, ack }) => {
      await ack();
      const action = body.actions[0];
      const walletId = action.block_id;
      walletDB.retireWallet(walletId);
    }
  );
};
