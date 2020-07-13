const betDB = require('../db/bet');
const walletDB = require('../db/wallet');
const consts = require("../consts");

const defaultPoints = 1000;
exports.setup = (app) => {

    app.action({
        action_id: 'set_me_up_fam'
    }, async ({
        body,
        ack
    }) => {
        await ack();
        const action = body.actions[0];
        const channelId = action.block_id;

        let season = walletDB.getCurrentSeason(channelId);
        const newWallet = walletDB.addWallet(channelId, body.user.id, consts.defaultPoints, season);
        betDB.addBet(body.user.id, channelId, newWallet._id, 'scenario text here', 500);

        // do things
    });
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