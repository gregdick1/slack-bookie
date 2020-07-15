const betAcceptHandler = require("./betAcceptHandler");
const submitResultHandler = require("./submitResultsHandler")

exports.setup = (app) => {
  app.action(
    {
      action_id: "bet_action_from_channel",
    },
    async ({ body, ack, context }) => {
      await ack();
      let action = body.actions[0].selected_option.value;

      if (action === 'accept_bet') {
        await betAcceptHandler.handleBetAccept(app, body, context);
      } else if (action === 'submit_results') {
        await submitResultHandler.handleSubmitResultsFromChannel(app, body, context);
      } else if (action === 'cancel_bet') {
        //TODO
      }
    }
  );

};
