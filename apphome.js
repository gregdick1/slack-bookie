const axios = require("axios");
const qs = require("qs");
const betAcceptDB = require("./db/betAccept");
const walletDB = require("./db/wallet");
const betDB = require("./db/bet");
const consts = require('./consts');
const utilities = require('./utilities/utilities');
const blockKitUtilities = require('./utilities/blockKitUtilities');
const betViewUtilities = require('./utilities/betViewUtilities');
const sortUtilities = require('./utilities/sortUtilities');

exports.displayHome = async (slackUser, /*channelId*/) => {
    const walletsForUser = walletDB.getAllWalletsForUser(slackUser, true);
    const allBetsForUser = betDB.getAllBetsForUser(slackUser);
    const allBetAcceptsForUser = betAcceptDB.getAllBetAcceptsForUser(slackUser);
    const args = {
        token: process.env.SLACK_BOT_TOKEN,
        user_id: slackUser,
        view: await updateView(slackUser, /*channelId,*/ walletsForUser, allBetsForUser, allBetAcceptsForUser),
    };
    await publishHomeView(args);
};

const publishHomeView = async (args) => {
    await axios
        .post(`${consts.apiBase}/views.publish`, qs.stringify(args))
        .then(function (response) { })
        .catch(function (error) {
            console.log(error);
        });
};


const welcomeBlock = () => {
    return blockKitUtilities.markdownSection(`${consts.DEBUG_MODE ? new Date().toLocaleTimeString() : ""}
A *wallet* is specific to a channel. 
If a channel isn't setup yet, type \`@bookie Let's gamble!\`
To initiate a bet, run \`/bookie-bet\``);
};

const warningBlock = () => {
    return blockKitUtilities.markdownSectionWithAccessoryImage("This is a slack bot that facilitates gambling. Gambling can be fun, but can also be dangerous. Only gamble what you're willing to lose.\r\n\r\nThe National Council on Problem Gambling Helpline offers a confidential, 24-hour helpline for problem gamblers or their family members at 1-800-522-4700",
        "https://www.bestuscasinos.org/wp-content/uploads/2019/12/Gambling-Mistake-1.jpg",
        "This is what happens when you gamble");
};


const summaryBlock = (walletsForUser, betsForUser, allBetAcceptsForUser) => {
    const betCount = betsForUser ? betsForUser.length : 0;
    const betAcceptCount = allBetAcceptsForUser ? allBetAcceptsForUser.length : 0;
    const activeWallets = walletsForUser.filter(w => w.isActiveSeason);
    const inactiveWallets = walletsForUser.filter(w => !w.isActiveSeason);
    const activeWalletCount = activeWallets ? activeWallets.length : 0;
    const inactiveWalletCount = inactiveWallets ? inactiveWallets.length : 0;
    const activeWalletPoints = utilities.sumThing(activeWallets, "points");
    const inactiveWalletPoints = utilities.sumThing(inactiveWallets, "points");
    const totalBetPoints = utilities.sumThing(betsForUser, "pointsBet");
    const totalBetAcceptPoints = utilities.sumThing(allBetAcceptsForUser, "pointsBet");
    return blockKitUtilities.markdownSection(`You have ${activeWalletCount} active wallets with a total of ${activeWalletPoints} points.
You have ${inactiveWalletCount} inactive wallets with a total of ${inactiveWalletPoints} points.
You have ${betCount} created bets for a total of ${totalBetPoints} points.
You have ${betAcceptCount} accepted bets for a total of ${totalBetAcceptPoints} points.
`);
};

const betSummaryView = (bet, wallet) => {
    const dateCreatedString = utilities.formatDate(bet.dateCreated);
    const betAccepts = betAcceptDB.getAllBetAcceptsForBet(bet._id);
    const betAcceptPoints = utilities.sumThing(betAccepts, 'pointsBet');
    const betAcceptPayouts = utilities.sumThing(betAccepts, 'payout');
    let dateAcceptedStringBuilder = '';
    let betAcceptedStringBuilder = '';
    betAccepts.forEach(ba => {
        dateAcceptedStringBuilder += (ba ? utilities.formatDate(ba.dateAccepted) : '') + '\n';
        betAcceptedStringBuilder += (ba ? utilities.formatSlackUserId(ba.userId) : '') + '\n';
    });
    const betAcceptedBy = betAcceptedStringBuilder.length > 0 ? betAcceptedStringBuilder : 'Nobody... yet';
    const dateAcceptedString = dateAcceptedStringBuilder.length > 0 ? dateAcceptedStringBuilder : 'Never... so far';
    const demFields = [
        blockKitUtilities.formatField('You Maximum Total Wager', utilities.strikethroughIfInactive(!wallet.betsAreActive, bet.pointsBet)),
        blockKitUtilities.formatField('Scenario Text', bet.scenarioText),
        blockKitUtilities.formatField('Bet Created', dateCreatedString),
        blockKitUtilities.formatField('Bet Accepted By', betAcceptedBy),
        //blockKitUtilities.formatField('Bet Accepted At', dateAcceptedString),
        blockKitUtilities.formatField('Accepted Wager Total', betAcceptPoints),
        blockKitUtilities.formatField('Original Post', `<${bet.postUrl}|Open>`),
        blockKitUtilities.formatField('Bet Status', betViewUtilities.formatBetStatus(bet.status)),
        blockKitUtilities.formatField('Odds', betViewUtilities.displayOdds(bet.odds)),
        blockKitUtilities.formatField('Potential Profit', profitString(betAcceptPayouts, betAcceptPoints)),
    ];
    if (bet.outcome) {
        demFields.push(blockKitUtilities.formatField('Result', betViewUtilities.betOutcomeDisplay(bet.outcome)));
    }

    return blockKitUtilities.markdownWithFieldsSection(demFields);
};

const profitString = (payout, wagered) => {
    if (payout == 0) {
        return `Nothing yet. Get somebody to bet against you!`;
    }
    const potentialProfit = payout - wagered;
    const potentialProfitPercentage = (100 * (payout / wagered)) - 100;
    return `${potentialProfit} pts or ${potentialProfitPercentage}% of your bet`;
};

const profitStringForBetAccept = (betAccept) => {
    return profitString(betAccept.payout, betAccept.pointsBet);
};

const betAcceptSummaryView = (betAccept, wallet) => {
    const dateAcceptedString = utilities.formatDate(betAccept.dateAccepted);
    const bet = betDB.getBetById(betAccept.betId);
    const dateCreatedString = utilities.formatDate(bet.dateCreated);
    const demFields = [
        //blockKitUtilities.formatField('Bet Maximum Points', utilities.strikethroughIfInactive(!wallet.betsAreActive, bet.pointsBet)),
        blockKitUtilities.formatField('Bet Text', bet.scenarioText),
        blockKitUtilities.formatField('Bet Created', dateCreatedString),
        //blockKitUtilities.formatField('Bet Accepted', dateAcceptedString),
        blockKitUtilities.formatField('Wager Points', betAccept.pointsBet),
        blockKitUtilities.formatField('Bet Creator', utilities.formatSlackUserId(bet.userId)),
        blockKitUtilities.formatField('Original Post', `<${bet.postUrl}|Open>`),
        blockKitUtilities.formatField('Bet Status', betViewUtilities.formatBetStatus(bet.status)),
        blockKitUtilities.formatField('Odds', betViewUtilities.displayOdds(bet.odds)),
        blockKitUtilities.formatField('Payout', betAccept.payout),
        blockKitUtilities.formatField('Potential Profit', profitStringForBetAccept(betAccept)),
    ];
    if (bet.outcome) {
        demFields.push(blockKitUtilities.formatField('Result', betViewUtilities.betOutcomeDisplay(bet.outcome, true)));
    }
    return blockKitUtilities.markdownWithFieldsSection(demFields);
}

const walletSummaryView = (wallet) => {
    const initialPoints = wallet.initialPointBalance ? wallet.initialPointBalance : consts.defaultPoints;
    const demFields = [
        blockKitUtilities.formatField('Channel', `<#${wallet.channelId}>`),
        blockKitUtilities.formatField('Is Active Season', wallet.isActiveSeason ? true : false),
        blockKitUtilities.formatField('Retired', wallet.retired ? true : false),
        blockKitUtilities.formatField('Season', wallet.season),
        blockKitUtilities.formatField('Points Not Tied Up in Bets', utilities.strikethroughIfInactive(!wallet.betsAreActive, wallet.points)),
        blockKitUtilities.formatField('Initial Points', initialPoints),
    ];
    return blockKitUtilities.markdownWithFieldsSection(demFields);
};

const walletActionView = (wallet) => {
    return blockKitUtilities.buttonAction(wallet._id, 'Retire Wallet', 'retire_wallet', 'danger');
};

const betActionView = (bet) => {
    return blockKitUtilities.buttonAction(bet._id, 'Do a thing?', 'what_thing', 'primary');
}

const betAcceptActionView = (betAccept) => {
    return blockKitUtilities.buttonAction(betAccept._id, 'Do a thing?', 'what_thing', 'primary');
}

// const setMeUpView = (channelId) => {
//     return blockKitUtilities.buttonAction(channelId, "Set Me Up", "set_me_up_fam");
// }

const homeViewSummary = (blockArray) => {
    return blockKitUtilities.homeView("Bookie Bot!", blockArray);
};

const getBetsForWallet = (allBetsForUser, walletId) => {
    return allBetsForUser.filter(b => b.walletId == walletId);
}

const getBetAcceptsForWallet = (allBetAcceptsForUser, walletId) => {
    return allBetAcceptsForUser.filter(ba => ba.walletId == walletId);
}

const updateView = async (slackUser, /*channelId, */ walletsForUser, allBetsForUser, allBetAcceptsForUser) => {
    let blockArray = [];
    // if (consts.DEBUG_MODE) {
    //     blockArray.push(setMeUpView(channelId));
    // }
    blockArray.push(welcomeBlock(slackUser));
    blockArray.push(blockKitUtilities.dividerBlock);
    if (walletsForUser) {
        blockArray.push(summaryBlock(walletsForUser, allBetsForUser, allBetAcceptsForUser));
        blockArray.push(blockKitUtilities.dividerBlock);
        blockArray.push(blockKitUtilities.dividerBlock);
        walletsForUser.sort(sortUtilities.walletSortFunc);
        for (let i = 0; i < walletsForUser.length; i++) {
            const wallet = walletsForUser[i];
            const betsForThisWallet = getBetsForWallet(allBetsForUser, wallet._id);
            const betAcceptsForThisWallet = getBetAcceptsForWallet(allBetAcceptsForUser, wallet._id);
            if (wallet.retired || !wallet.isActiveSeason) {
                continue;
            }
            blockArray.push(walletSummaryView(wallet));
            blockArray.push(walletActionView(wallet));
            blockArray.push(blockKitUtilities.dividerBlock);
            if (betsForThisWallet && betsForThisWallet.length > 0) {
                blockArray.push(blockKitUtilities.markdownSection(
                    `Here are your created bets in ${utilities.formatChannelId(wallet.channelId)} during season ${wallet.season}:`));
                betsForThisWallet.sort(sortUtilities.betSortFunc);
                for (let j = 0; j < betsForThisWallet.length; j++) {
                    const thisBet = betsForThisWallet[j];
                    blockArray.push(betSummaryView(thisBet, wallet));
                    blockArray.push(betActionView(thisBet));
                }
            }
            if (betAcceptsForThisWallet && betAcceptsForThisWallet.length > 0) {
                blockArray.push(blockKitUtilities.markdownSection(
                    `You have agreed to the following bets in ${utilities.formatChannelId(wallet.channelId)} during season ${wallet.season}:`));
                betAcceptsForThisWallet.sort(sortUtilities.betAcceptSortFunc);
                for (let j = 0; j < betAcceptsForThisWallet.length; j++) {
                    const thisBetAccept = betAcceptsForThisWallet[j];
                    blockArray.push(betAcceptSummaryView(thisBetAccept, wallet));
                    blockArray.push(betAcceptActionView(thisBetAccept));
                }
            }
            blockArray.push(blockKitUtilities.dividerBlock);
            blockArray.push(blockKitUtilities.dividerBlock);
        }
    }
    blockArray.push(warningBlock());
    const homeView = homeViewSummary(blockArray);
    return JSON.stringify(homeView);
};