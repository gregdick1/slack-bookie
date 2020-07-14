const wallet = require("../db/wallet");
const consts = require("../consts");

exports.setup = (app) => {
  app.message(
    `<@${consts.botId}> Let's gamble!`,
    async ({ message, context, say }) => {
      //TODO set up bot id as config or pull it during app startup or something
      const channel = message.channel;
      if (wallet.getCurrentSeason(channel) !== 0) {
        await say("This channel is already set up to gamble!");
      } else {
        const result = await app.client.conversations.members({
          token: context.botToken,
          channel: message.channel,
        });
        result.members.forEach((item, index) => {
          if (item === consts.botId) {
            return;
          }
          wallet.addWallet(channel, item, consts.defaultPoints, 1);
        });
        await say(
          `I've set up ${result.members.length - 1} wallets. Let's make a bet!`
        );
      }
    }
  );

  //This message and action below are testing code
  app.message(
    `<@${consts.botId}> test bet`,
    async ({ message, context, say }) => {
      await say({
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text:
                "This is a test, but eventually would be the post where somebody has created a bet and others can accept that bet.",
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
        ],
      });
    }
  );

  app.action(
    {
      action_id: "accept_bet",
    },
    async ({ body, ack, context }) => {
      console.log("ack");
      await ack();

      try {
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
            // private_metadata: JSON.stringify({
            //   wallet: wallet,
            // }),
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: "I want to accept this bet!",
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
};
