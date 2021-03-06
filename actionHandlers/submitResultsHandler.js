const betService = require("../services/betService");
const betDB = require("../db/bet");
const betAcceptDB = require("../db/betAccept");
const utilities = require('../utilities/utilities');
const blockKitUtilities = require("../utilities/blockKitUtilities");
const betViewUtilities = require("../utilities/betViewUtilities");
const mobVotehandler = require("./mobVoteHandler");


exports.getResultDisplay = (result) => {
  let resultDisplay = "";
  if (result === "yes") {
    resultDisplay = "Yes";
  } else if (result === "no") {
    resultDisplay = "No";
  } else if (result === "cancel") {
    resultDisplay = "Inconclusive";
  }
  return resultDisplay;
}

exports.handleDisputeVoteResult = async (app, body, context, betId, result) => {

  const bet = betDB.getBetById(betId);
  const channel = bet.channelId;
  const betAccepts = betAcceptDB.getAllBetAcceptsForBet(betId);

  let { distributionMessage } = betService.closeBet(bet._id, result);

  let usersToPing = [bet.userId, ...betAccepts.map(ba => ba.userId)];
  usersToPing = usersToPing.map((x) => utilities.formatSlackUserId(x));

  message = `Hey ${usersToPing.join(", ")},\nThe mob has spoken and the outcome of this bet was ${this.getResultDisplay(result)}. ${distributionMessage} This bet is now closed. Happy Gambling!`;

  await app.client.chat.update({
    token: context.botToken,
    channel: bet.channelId,
    ts: bet.postId,
    blocks: betViewUtilities.getBetPostView(bet, betDB.statusFinished, 0),
  });

  await app.client.chat.postMessage({
    token: context.botToken,
    channel: bet.channelId,
    thread_ts: bet.postId,
    text: message,
  });
}

exports.handleSubmitResultsFromChannel = async (app, body, context) => {
  try {
    const postId = body.message.ts;
    const channel = body.channel.id;
    const bet = betDB.getBetByPostId(channel, postId);
    const betAccepts = betAcceptDB.getAllBetAcceptsForBet(bet._id);

    let userCanSubmit = false;
    const user = body.user.id;
    if (user === bet.userId) {
      userCanSubmit = true;
    } else {
      const betAcceptUsers = betAccepts.map(x => x.userId);
      if (betAcceptUsers.includes(user)) {
        userCanSubmit = true;
      }
    }

    let betHasDispute = false;
    if (bet.result_submissions && bet.result_submissions.length > 1) {
      const creatorSideResults = bet.result_submissions.filter((x) => x.betSide == "creator").map((x) => x.result);
      const acceptorSideResults = bet.result_submissions.filter((x) => x.betSide == "acceptor").map((x) => x.result);
      if (creatorSideResults.length > 0 && acceptorSideResults.length > 0) {
        betHasDispute = true;
      }
    }

    let blocks = [
      blockKitUtilities.markdownSection(`<@${bet.userId}> bet that...`),
      blockKitUtilities.markdownSection(bet.scenarioText),
      blockKitUtilities.divider()
    ];
    if (!userCanSubmit) {
      blocks.push(blockKitUtilities.markdownSection('Sorry, you are not a part of this bet, so you cannot submit results.'));
    } else {
      let options = [
        blockKitUtilities.option(":yes:", "yes"),
        blockKitUtilities.option(":no:", "no"),
        blockKitUtilities.option("Inconclusive :notsureif:", "cancel"),
      ];
      if (betHasDispute) {
        options.push(blockKitUtilities.option("Settle dispute with mob vote.", "dispute"));
      }

      blocks.push(blockKitUtilities.selectInput("bet_result", "Did it happen?", "Did it happen?", "bet_result_input", options));
    }
    const modalView = blockKitUtilities.modalView("results_submission", "Tell me what happened",
      {
        bet: bet,
      }, blocks, "Submit", userCanSubmit);
    modal = {
      token: context.botToken,
      // Pass a valid trigger_id within 3 seconds of receiving it
      trigger_id: body.trigger_id,
      // View payload
      view: modalView
    };
    const result = await app.client.views.open(modal);

  } catch (error) {
    console.error(error);
  }
}

exports.setup = (app) => {
  const handle_submit_results = async (body, context, result) => {
    const view = body.view;
    const userId = body.user.id;

    const md = JSON.parse(view.private_metadata);
    const bet = betDB.getBetById(md.bet._id); //get it from the database so we can modify and save it
    if (!bet.result_submissions) {
      bet.result_submissions = [];
    }

    const submitted_users = bet.result_submissions.map((x) => x.userId);
    let newResult = true;
    if (submitted_users.includes(userId)) {
      //User is changing their submission
      bet.result_submissions.forEach((rs) => {
        if (rs.userId === userId) {
          rs.result = result;
          betDB.save();
          newResult = false;
        }
      });
    }

    const betAccepts = betAcceptDB.getAllBetAcceptsForBet(bet._id);
    const betAcceptUsers = betAccepts.map((x) => x.userId);
    let betSide = "";
    if (userId === bet.userId) {
      betSide = "creator";
    } else if (betAcceptUsers.includes(userId)) {
      betSide = "acceptor";
    } else {
      //Not part of the bet, can't do anything
      return;
    }

    if (newResult) {
      bet.result_submissions.push({
        userId: userId,
        result: result,
        betSide: betSide,
      });
      betDB.save();
    }

    let sideToMessage = "creator";
    if (betSide === "creator") {
      sideToMessage = "acceptor";
    }

    let usersToPing = [];
    if (sideToMessage === "creator") {
      usersToPing.push(bet.userId);
    } else if (sideToMessage === "acceptor") {
      usersToPing.push(...betAcceptUsers);
    }
    usersToPing = usersToPing.map((x) => utilities.formatSlackUserId(x));

    let resultDisplay = this.getResultDisplay(result);

    let message = "";
    if (bet.result_submissions.length > 1) {
      const creatorSideResults = bet.result_submissions
        .filter((x) => x.betSide == "creator")
        .map((x) => x.result);
      const acceptorSideResults = bet.result_submissions
        .filter((x) => x.betSide == "acceptor")
        .map((x) => x.result);
      if (
        creatorSideResults.length > 0 &&
        acceptorSideResults.includes(creatorSideResults[0])
      ) {
        //There is consensus. Close the bet
        usersToPing = [bet.userId, ...betAcceptUsers];
        usersToPing = usersToPing.map((x) => utilities.formatSlackUserId(x));
        
        let { distributionMessage } = betService.closeBet(bet._id, result);
        message = `Hey ${usersToPing.join(", ")},\nBoth sides have agreed the outcome of this bet was ${resultDisplay}. ${distributionMessage} This bet is now closed. Happy Gambling!`;

        await app.client.chat.update({
          token: context.botToken,
          channel: bet.channelId,
          ts: bet.postId,
          blocks: betViewUtilities.getBetPostView(bet, betDB.statusFinished, 0),
        });
      } else if (
        creatorSideResults.length > 0 &&
        acceptorSideResults.length > 0
      ) {
        //There is a dispute
        message =
          `Hey ${usersToPing.join(", ")},\n${utilities.formatSlackUserId(userId)} has said the` +
          ` result of this bet was ${resultDisplay} which means we have a dispute. You or they can resubmit your vote to change if there was a mistake. Otherwise, resubmit and choose to send it to the mob for a vote to resolve this bet.`;
      }
    } else if (bet.result_submissions.length === 1) {
      //Tell the other side to confirm or dispute
      message =
        `Hey ${usersToPing.join(", ")},\n${utilities.formatSlackUserId(userId)} has said the` +
        ` result of this bet was ${resultDisplay}. Please submit a result to confirm and complete the bet, or dispute it by selecting a different result. Parties can change their voted result until they match, or send the dispute to a mob vote in the channel.`;
    }

    await app.client.chat.postMessage({
      token: context.botToken,
      channel: bet.channelId,
      thread_ts: bet.postId,
      text: message,
    });
  };

  // Modal submission from the channel
  app.view("results_submission", async ({
    ack,
    body,
    view,
    context
  }) => {
    // Acknowledge the view_submission event
    await ack();

    const user = body.user.id;

    const md = JSON.parse(view.private_metadata);
    const bet = md.bet;
    const channel = bet.channelId;

    const val = view["state"]["values"]["bet_result"]["bet_result_input"]["selected_option"]["value"];
    if (val === 'dispute') {
      mobVotehandler.handleDispute(app, body, context, bet);
    } else {
      await handle_submit_results(body, context, val);
    }
  });
};