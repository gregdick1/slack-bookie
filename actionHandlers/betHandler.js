const betDB = require("../db/bet");
const walletDB = require("../db/wallet");
const consts = require("../consts");
const blockKitUtilities = require("../utilities/blockKitUtilities");
const betViewUtilities = require("../utilities/betViewUtilities");
const utilities = require('../utilities/utilities');
const appHome = require('../apphome');

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
  let oddsString = oddsInput;
  if (!match) {
    errors = {
      odds_input: "Odds must be in the format A:B"
    }
  } else {
    //In the UI, we show the odds from the perspective of the bet acceptors. In the code, we use it in the perspective of the bet creator
    const unreducedNumerator = parseInt(match[2]);
    const unreducedDenominator = parseInt(match[1]);
    const gcd = utilities.gcd(unreducedNumerator, unreducedDenominator);
    odds = { numerator: unreducedNumerator / gcd, denominator: unreducedDenominator / gcd };
    oddsString = `${odds.denominator}:${odds.numerator}`;
  }

  if (isNaN(amount) || amount <= 0) {
    errors = errors === undefined ? {} : errors;
    errors.amount_input = "Please input a valid number of points";
  } else if (wallet.points < amount) {
    errors = errors === undefined ? {} : errors;
    errors.amount_input = `You only have ${wallet.points} points in your wallet!`;
  } else if (odds && amount < odds.denominator) {
    errors = errors === undefined ? {} : errors;
    errors.amount_input = `With odds of ${oddsString}, you must put up at least ${odds.denominator}`
  } else if (odds && amount % odds.denominator !== 0) {
    errors = errors === undefined ? {} : errors;
    errors.amount_input = `With odds of ${oddsString}, your amount must be a multiple of ${odds.denominator}.`
  }

  if (errors !== undefined) {
    await ack({
      response_action: "errors",
      errors,
    });
  } else {
    await ack();
  }

  return { errors, inputs: { amount, odds } }
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
        const modalViewBlocks = [
          blockKitUtilities.markdownSection("Let's make a bet!"),
          blockKitUtilities.markdownSection(`You have ${wallet.points} points available`),
          blockKitUtilities.divider(),
          blockKitUtilities.textInput("bet_scenario", "I bet that...", "dreamy_input", true),
          blockKitUtilities.textInput("amount_input", "How many points am I putting up?", "amount_input"),
          blockKitUtilities.textInput("odds_input", "What odds am I giving to others?", "odds_input", false, "1:1"),
          blockKitUtilities.markdownSection("_e.g. 2:1 means the other people put up half as many points as me._"),
        ];
        const modalView = blockKitUtilities.modalView("bet_creation", "Create a Bet", {
          wallet: wallet,
        }, modalViewBlocks, "Submit", true);
        const result = await app.client.views.open({
          token: context.botToken,
          // Pass a valid trigger_id within 3 seconds of receiving it
          trigger_id: body.trigger_id,
          // View payload
          view: modalView,
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
    const { errors, inputs: { amount, odds } } = await validateFieldInputs(ack, view, wallet)

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
      blocks: betViewUtilities.getBetPostView(temp_bet, betDB.statusOpen, canTake)
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

  app.view("wallet_retire_confirm", async ({
    ack,
    body,
    view,
    context
  }) => {
    await ack();
    const user = body.user.id;
    const md = JSON.parse(view.private_metadata);
    walletDB.retireWallet(md.wallet._id);
    appHome.displayHome(user);
  });
  app.action({
    action_id: "retire_wallet",
  },
    async ({
      body,
      ack,
      view,
      context
    }) => {
      await ack();
      const action = body.actions[0];
      const walletId = action.block_id;
      const wallet = walletDB.getWalletById(walletId);
      const modalViewBlocks = [
        blockKitUtilities.markdownSection(`You're about to retire the wallet for ${utilities.formatChannelId(wallet.channelId)}...`),
        blockKitUtilities.markdownSection("This is permanent. You will not be able to bet until next season"),
      ];
      const modalView = blockKitUtilities.modalView("wallet_retire_confirm", "Are you sure?", {
        wallet: wallet,
      }, modalViewBlocks, "I'm sure", true);
      const result = await app.client.views.open({
        token: context.botToken,
        trigger_id: body.trigger_id,
        view: modalView,
      });
    }
  );
};