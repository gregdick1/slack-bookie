exports.setup = (app) => {
  // Listen for a slash command invocation
  app.command("/bookie-test", async ({ ack, body, context }) => {
    // Acknowledge the command request
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
          callback_id: "bet_creation",
          title: {
            type: "plain_text",
            text: "Create a Bet",
          },
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
    const user = body["user"]["id"];

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
