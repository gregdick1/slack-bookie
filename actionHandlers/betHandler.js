const betDB = require('../db/bet');

exports.setup = (app) => {
    app.action({
        action_id: 'clymer_test'
    }, async ({
        body,
        ack
    }) => {
        await ack();
        betDB.addBet('U025Q1R5B', 'D01700NPHGB', 'e559c293-6854-4762-8c76-09ca0fb53f30', 'scenario', 500);
    });
};