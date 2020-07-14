const walletDb = require("../db/wallet");
const betDb = require("../db/bet");
const betAcceptDb = require("../db/betAccept");
const blockKitUtilities = require("../utilities/blockKitUtilities");

exports.setup = (app) => {
  app.action({
      action_id: "submit_results_from_channel",
    },
    async ({
      body,
      ack,
      context
    }) => {
      await ack();
      try {
        const postId = body.message.ts;
        const channel = body.channel.id;
        const bet = betDb.getBetByPostId(channel, postId);

        //TODO check if user is associated with the bet

        const result = await app.client.views.open({
          token: context.botToken,
          // Pass a valid trigger_id within 3 seconds of receiving it
          trigger_id: body.trigger_id,
          // View payload
          view: {
            type: "modal",
            // View identifier
            callback_id: "results_submission",
            title: {
              type: "plain_text",
              text: "Tell me what happened",
            },
            private_metadata: JSON.stringify({
              bet: bet,
            }),
            blocks: [blockKitUtilities.markdownSection(`<@${bet.slackId}> bet that...`),
              blockKitUtilities.markdownSection(bet.scenarioText), {
                type: "input",
                label: {
                  type: "plain_text",
                  text: "Did it happen?",
                },
                block_id: "bet_result",
                element: {
                  type: "static_select",
                  placeholder: {
                    type: "plain_text",
                    text: "Did it happen?",
                  },
                  action_id: "bet_result_input",
                  options: [{
                      text: {
                        type: "plain_text",
                        text: ":yes:",
                        emoji: true,
                      },
                      value: "yes",
                    },
                    {
                      text: {
                        type: "plain_text",
                        text: ":no:",
                        emoji: true,
                      },
                      value: "no",
                    },
                    {
                      text: {
                        type: "plain_text",
                        text: "Inconclusive :notsureif:",
                        emoji: true,
                      },
                      value: "cancel",
                    },
                  ],
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

  //Probably a better home for this logic
  const close_bet = (bet, betAccepts, result) => {
    if (["yes", "no"].includes(result)) {
      bet.status = betDb.statusFinished;
    } else if (result === "inconclusive") {
      bet.status = betDb.statusCanceled;
    }
    betDb.save();

    if (result === "yes") {
      //Creator is winner. They get points from the bet accepts as well as the original bet points back
      let creatorWallet = walletDb.getWalletById(bet.walletId);
      creatorWallet.points += bet.pointsBet;
      betAccepts.forEach((ba) => {
        creatorWallet.points += ba.pointsBet;
      });
      walletDb.save();
    } else if (result === "no") {
      //Acceptors win, they receive the payouts from their bet accepts
      betAccepts.forEach((ba) => {
        let acceptorWallet = walletDb.getWalletById(ba.walletId);
        acceptorWallet.points += ba.payout;
      });
      walletDb.save();
    } else if (result === "cancel") {
      //Everyone gets their original points back
      let creatorWallet = walletDb.getWalletById(bet.walletId);
      creatorWallet.points += bet.pointsBet;

      betAccepts.forEach((ba) => {
        let acceptorWallet = walletDb.getWalletById(ba.walletId);
        acceptorWallet.points += ba.pointsBet;
      });
      walletDb.save();
    }
  };

  const handle_submit_results = async (body, context, result) => {
    const view = body.view;
    const userId = body.user.id;

    const md = JSON.parse(view.private_metadata);
    const bet = betDb.getBetById(md.bet._id); //get it from the database so we can modify and save it
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
          betDb.save();
          newResult = false;
        }
      });
    }

    const betAccepts = betAcceptDb.getAllBetAcceptsForBet(bet._id);
    const betAcceptUsers = betAccepts.map((x) => x.userId);
    let betSide = "";
    if (userId === bet.slackId) {
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
      betDb.save();
    }

    let sideToMessage = "creator";
    if (betSide === "creator") {
      sideToMessage = "acceptor";
    }

    let usersToPing = [];
    if (sideToMessage === "creator") {
      usersToPing.push(bet.slackId);
    } else if (sideToMessage === "acceptor") {
      usersToPing.push(...betAcceptUsers);
    }
    usersToPing = usersToPing.map((x) => `<@${x}>`);

    let resultDisplay = "";
    if (result === "yes") {
      resultDisplay = "Yes";
    } else if (result === "no") {
      resultDisplay = "No";
    } else if (result === "cancel") {
      resultDisplay = "Inconclusive";
    }

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
        usersToPing = [userId, ...betAcceptUsers];
        usersToPing = usersToPing.map((x) => `<@${x}>`);
        message = `Hey ${usersToPing.join(
          ", "
        )},\nBoth sides have agreed the outcome of this bet was ${resultDisplay}. This bet is now closed. Happy Gambling!`;
        close_bet(bet, betAccepts, result);
      } else if (
        creatorSideResults.length > 0 &&
        acceptorSideResults.length > 0
      ) {
        //There is a dispute
        message =
          `Hey ${usersToPing.join(", ")},\n<@${userId}> has said the` +
          ` result of this bet was ${resultDisplay} which means we have a dispute. You or they can resubmit your vote to change if there was a mistake. Otherwise, resubmit and choose to send it to the mob for a vote to resolve this bet.`;
      }
    } else if (bet.result_submissions.length === 1) {
      //Tell the other side to confirm or dispute
      message =
        `Hey ${usersToPing.join(", ")},\n<@${userId}> has said the` +
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

    const val =
      view["state"]["values"]["bet_result"]["bet_result_input"][
        "selected_option"
      ]["value"];
    await handle_submit_results(body, context, val);
  });
};