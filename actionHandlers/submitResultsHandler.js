const walletDb = require("../db/wallet");
const betDb = require("../db/bet");
const betAcceptDb = require("../db/betAccept");

exports.setup = (app) => {
  app.action(
    {
      action_id: "submit_results_from_channel",
    },
    async ({ body, ack, context }) => {
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
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `<@${bet.slackId}> bet that...`,
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
                  text: "Did it happen?",
                },
              },
              {
                type: "actions",
                block_id: "amount_input",
                elements: [
                  {
                    type: "button",
                    text: {
                      type: "plain_text",
                      text: "Yes",
                    },
                    action_id: "submit_results_yes",
                  },
                  {
                    type: "button",
                    text: {
                      type: "plain_text",
                      text: "No",
                    },
                    action_id: "submit_results_no",
                  },
                  {
                    type: "button",
                    text: {
                      type: "plain_text",
                      text: "Inconclusive",
                    },
                    action_id: "submit_results_cancel",
                  },
                ],
              },
            ],
          },
        });
        console.log(result);
      } catch (error) {
        console.error(error);
      }
    }
  );

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
        //TODO
        //We have consensus
      } else if (creatorSideResults.length > 0 && acceptorSideResults > 0) {
        //TODO
        //we have conflict
        //Tell the other side there is conflict. They can either change their vote or submit to mob vote
      }
    } else if (bet.result_submissions.length === 1) {
      //Tell the other side to confirm or dispute
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

      let message =
        `Hey ${usersToPing.join(", ")},\n<@${userId}> has said the` +
        ` result of this was ${resultDisplay}. Please submit a result to confirm and complete the bet, or dispute it by selecting a different result. Parties can change their voted result until they match, or send the dispute to a mob vote in the channel.`;
      await app.client.chat.postMessage({
        token: context.botToken,
        channel: bet.channelId,
        thread_ts: bet.postId,
        text: message,
      });
    }
  };

  app.action(
    {
      action_id: "submit_results_yes",
    },
    async ({ body, ack, context }) => {
      await ack();
      await handle_submit_results(body, context, "yes");
    }
  );

  app.action(
    {
      action_id: "submit_results_no",
    },
    async ({ body, ack, context }) => {
      await ack();
      await handle_submit_results(body, context, "no");
    }
  );

  app.action(
    {
      action_id: "submit_results_cancel",
    },
    async ({ body, ack, context }) => {
      await ack();
      await handle_submit_results(body, context, "cancel");
    }
  );

  // Handle a view_submission event
  app.view(
    "submit_results_from_channel",
    async ({ ack, body, view, context }) => {
      // Acknowledge the view_submission event
      await ack();

      const user = body.user.id;

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

      betAcceptDb.addBetAccept(bet._id, user, channel, wallet._id, amount);
    }
  );
};
