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
        betDB.addBet(body.user.id, channelId, newWallet._id, 'scenario text here', 1, 'post1');
        betDB.addBet(body.user.id, channelId, newWallet._id, 'scenario text here2', 2, 'post2');
        betDB.addBet(body.user.id, channelId, newWallet._id, 'scenario text here3', 3, 'post3');
        betDB.addBet(body.user.id, channelId, newWallet._id, 'scenario text here4', 4, 'post4');
        betDB.addBet(body.user.id, channelId, newWallet._id, 'scenario text here5', 5, 'post5');
        betDB.addBet(body.user.id, channelId, newWallet._id, 'scenario text here6', 6, 'post6');

        // do things
    });
    app.action({
        action_id: 'retire_wallet'
    }, async ({
        body,
        ack
    }) => {
        await ack();
        const action = body.actions[0];
        const walletId = action.block_id;
        walletDB.retireWallet(walletId);
    });
};