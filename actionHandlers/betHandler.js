const betDB = require("../db/bet");
const walletDB = require("../db/wallet");
const consts = require("../consts");
const blockKitUtilities = require("../utilities/blockKitUtilities");
const betViewUtilities = require("../utilities/betViewUtilities");
const utilities = require('../utilities/utilities');

const validateFieldInputs = async (ack, view, wallet) => {
  let errors = undefined;
  const fieldVals = view.state.values;
  if (!fieldVals["amount_input"] || !fieldVals["odds_input"]) {
    errors = {
      amount_input: "Please input an amount to bet and odds"
    };

    await ack({
      response_action: "errors",
      errors
    });

    return { 
      errors,
      input: undefined 
    };
  }

  const amountInput = fieldVals["amount_input"]["amount_input"]["value"];
  const amount = parseInt(amountInput, 10);

  const oddsInput = fieldVals["odds_input"]["odds_input"]["value"]
  const match = oddsInput.match(/([0-9]+):([0-9]+)/);
  let odds = undefined
  if (!match) {
    errors = {
      odds_input: "Odds must be in the format A:B"
    }
  } else {
    odds = { numerator: match[1], denominator: match[2] };
  }

  if (isNaN(amount)) {
    errors = errors === undefined ? {} : errors;
    errors.amount_input = "Please input a valid number of points";
  } else if (wallet.points < amount) {
    errors = errors === undefined ? {} : errors;
    errors.amount_input = `You only have ${wallet.points} points in your wallet!`;
  }

  if (errors !== undefined) {
    await ack({
      response_action: "errors",
      errors,
    });
  } else {
    await ack();
  }

  return { errors, inputs: { amount, odds} }
}

exports.setupBets = (app) => {
  // Listen for a slash command invocation
  app.command(
    `/${consts.commandPrefix}bookie-bet`,
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
      const season = walletDB.getCurrentSeason(channel);
      const wallet = walletDB.getWalletForSeason(channel, user, season);
      if (!wallet) {
        say(
          `${utilities.formatSlackUserId(user)} wants to make a bet, but they don't have a wallet! Is this channel set up for gambling? If not, someone should say \`@Bookie Let's gamble!\``
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
              blockKitUtilities.markdownSection("Let's make a bet!"),
              blockKitUtilities.markdownSection(`You have ${wallet.points} points available`),
              blockKitUtilities.divider(),
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
              {
                type: "input",
                block_id: "odds_input",
                label: {
                  type: "plain_text",
                  text: "At odds of:",
                },
                element: {
                  type: "plain_text_input",
                  action_id: "odds_input",
                  initial_value: "1:1"
                },
              },
              // blockKitUtilities.divider(),
              // blockKitUtilities.markdownSectionWithAccessoryButton(
              //   "Once you've entered an amount and odds, this section can show you the payouts before you submit the bet",
              //   "Calculate Payouts",
              //   "recalc_payouts"
              // ),
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

  // TODO: Some way to display payouts given current odds before final submission?

  // app.action("recalc_payouts", async ({ ack, body }) => {
  //   const view = body.view
  //   const md = JSON.parse(view.private_metadata);
  //   const wallet = md.wallet;

  //   const { errors, inputs } = await validateFieldInputs(ack, view, wallet);
  //   if (errors) return;
    
  //   console.log("no errrors");
  // });

  // Handle a view_submission event
  app.view("bet_creation", async ({
    ack,
    body,
    view,
    context
  }) => {
    const user = body.user.id;
    const val =
      view["state"]["values"]["bet_scenario"]["dreamy_input"]["value"];

    const md = JSON.parse(view.private_metadata);
    const wallet = md.wallet;
    const { errors,  inputs: { amount, odds } } = await validateFieldInputs(ack, view, wallet)

    if (errors) return;

    const channel = wallet.channelId;

    const temp_bet = {
      userId: user,
      scenarioText: val,
      pointsBet: amount,
      odds,
    }
    const canTake = Math.trunc(odds.numerator * amount / odds.denominator)

    const result = await app.client.chat.postMessage({
      token: context.botToken,
      channel: channel,
      blocks: betViewUtilities.getBetPostView(temp_bet, 'Open', canTake)
    });

    const postId = result.ts;
    betDB.addBet(user, channel, wallet._id, val, amount, odds, postId);
    walletDB.updateBalance(wallet._id, -amount);
  });
};

exports.setup = (app) => {
  app.action({
    action_id: "set_me_up_fam",
  },
    async ({
      body,
      ack
    }) => {
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
  app.action({
    action_id: "retire_wallet",
  },
    async ({
      body,
      ack
    }) => {
      await ack();
      const action = body.actions[0];
      const walletId = action.block_id;
      walletDB.retireWallet(walletId);
    }
  );
};