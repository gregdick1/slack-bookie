const axios = require("axios");
const qs = require("qs");
const betAcceptDB = require("./db/betAccept");
const betDB = require("./db/bet");
const consts = require('./consts');
const utilities = require('./utilities/utilities');
const blockKitUtilities = require('./utilities/blockKitUtilities');
const sortUtilities = require('./utilities/sortUtilities');

exports.displayHome = async (slackUser, channelId, walletsForUser, allBetsForUser, allBetAcceptsForUser) => {
    const args = {
        token: process.env.SLACK_BOT_TOKEN,
        user_id: slackUser,
        view: await updateView(slackUser, channelId, walletsForUser, allBetsForUser, allBetAcceptsForUser),
    };
    await publishHomeView(args);
};

const publishHomeView = async (args) => {
    await axios
        .post(`${consts.apiBase}/views.publish`, qs.stringify(args))
        .then(function (response) {})
        .catch(function (error) {
            console.log(error);
        });
};


const welcomeBlock = () => {
    return blockKitUtilities.markdownSection(`${consts.DEBUG_MODE ? new Date().toLocaleTimeString() : ""}
            
A *wallet* is specific to a channel. If a channel isn't setup yet, type '@bookie Let's gamble!'

After that, here are some things you can do:
- 1 fun thing
* another fun thing`);
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
    return blockKitUtilities.markdownSection(`*Summary*
You have ${activeWalletCount} active wallets with a total of ${activeWalletPoints} points.
You have ${inactiveWalletCount} inactive wallets with a total of ${inactiveWalletPoints} points.
You have ${betCount} created bets for a total of ${totalBetPoints} points.
You have ${betAcceptCount} accepted bets for a total of ${totalBetAcceptPoints} points.
`);
};

const betSummaryView = (bet, wallet) => {
    const dateCreatedString = utilities.formatDate(bet.dateCreated);
    const betAccepts = betAcceptDB.getAllBetAcceptsForBet(bet._id);
    const betAcceptPoints = utilities.sumThing(betAccepts, 'pointsBet');
    const demFields = [
        `*Points:* ${utilities.strikethroughIfInactive(!wallet.betsAreActive, bet.pointsBet)}`,
        `*Scenario Text:* ${bet.scenarioText}`,
        `*Bet Created:* ${dateCreatedString}`,
        `*Bet Accepts:* ${betAccepts.length}`,
        `*Bet Accepted Points:* ${betAcceptPoints}`,
        `*Original Post:* <${bet.postUrl}|Open>`,
    ];
    return blockKitUtilities.markdownWithFieldsSection(demFields);
};

const betAcceptSummaryView = (betAccept, wallet) => {
    const dateAcceptedString = utilities.formatDate(betAccept.dateAccepted);
    const bet = betDB.getBetById(betAccept.betId);
    const dateCreatedString = utilities.formatDate(bet.dateCreated);
    const demFields = [
        `*Points:* ${utilities.strikethroughIfInactive(!wallet.betsAreActive, betAccept.pointsBet)}`,
        `*Bet Text:* ${bet.scenarioText}`,
        `*Bet Created:* ${dateCreatedString}`,
        `*Bet Accepted:* ${dateAcceptedString}`,
        `*Bet Creator:* <@${bet.userId}>`,
        `*Original Post:* <${bet.postUrl}|Open>`,
    ];
    return blockKitUtilities.markdownWithFieldsSection(demFields);
}

const walletSummaryView = (wallet) => {
    const initialPoints = wallet.initialPointBalance ? wallet.initialPointBalance : consts.defaultPoints;
    const demFields = [
        `*Channel:* <#${wallet.channelId}>`,
        `*Points:* ${utilities.strikethroughIfInactive(!wallet.betsAreActive,wallet.points)}`,
        `*Season:* ${wallet.season}`,
        `*Retired:* ${wallet.retired ? true : false}`,
        `*Is Active:* ${wallet.isActiveSeason ? true : false}`,
        `*Initial Points:* ${initialPoints}`
    ];
    return blockKitUtilities.markdownWithFieldsSection(demFields);
};

const walletActionView = (wallet) => {
    return blockKitUtilities.buttonAction(wallet._id, 'Retire Wallet', 'retire_wallet', 'danger');
};

const setMeUpView = (channelId) => {
    return blockKitUtilities.buttonAction(channelId, "Set Me Up", "set_me_up_fam");
}

const homeViewSummary = (blockArray) => {
    return {
        type: "home",
        title: {
            type: "plain_text",
            text: "Gambling is dangerous",
        },
        blocks: blockArray,
    };
};

const getBetsForWallet = (allBetsForUser, walletId) => {
    return allBetsForUser.filter(b => b.walletId == walletId);
}

const getBetAcceptsForWallet = (allBetAcceptsForUser, walletId) => {
    return allBetAcceptsForUser.filter(ba => ba.walletId == walletId);
}

const updateView = async (slackUser, channelId, walletsForUser, allBetsForUser, allBetAcceptsForUser) => {
    let blockArray = [];
    if (consts.DEBUG_MODE) {
        blockArray.push(setMeUpView(channelId));
    }
    blockArray.push(welcomeBlock(slackUser));
    blockArray.push(blockKitUtilities.dividerBlock);
    if (walletsForUser) {
        blockArray.push(summaryBlock(walletsForUser, allBetsForUser, allBetAcceptsForUser));
        blockArray.push(blockKitUtilities.dividerBlock);
        walletsForUser.sort(sortUtilities.walletSortFunc);
        for (let i = 0; i < walletsForUser.length; i++) {
            const wallet = walletsForUser[i];
            const betsForThisWallet = getBetsForWallet(allBetsForUser, wallet._id);
            const betAcceptsForThisWallet = getBetAcceptsForWallet(allBetAcceptsForUser, wallet._id);
            blockArray.push(walletSummaryView(wallet));
            if (betsForThisWallet && betsForThisWallet.length > 0) {
                blockArray.push(blockKitUtilities.markdownSection(`Here are your created bets in <#${wallet.channelId}>:`));
                betsForThisWallet.sort(sortUtilities.betSortFunc);
                for (let j = 0; j < betsForThisWallet.length; j++) {
                    const thisBet = betsForThisWallet[j];
                    blockArray.push(betSummaryView(thisBet, wallet));
                }
            }
            if (betAcceptsForThisWallet && betAcceptsForThisWallet.length > 0) {
                blockArray.push(blockKitUtilities.markdownSection(`You have agreed to the following bets in <#${wallet.channelId}>:`));
                betAcceptsForThisWallet.sort(sortUtilities.betAcceptSortFunc);
                for (let j = 0; j < betAcceptsForThisWallet.length; j++) {
                    const thisBetAccept = betAcceptsForThisWallet[j];
                    blockArray.push(betAcceptSummaryView(thisBetAccept, wallet));
                }
            }
            blockArray.push(walletActionView(wallet));
            blockArray.push(blockKitUtilities.dividerBlock);
        }
    }
    blockArray.push(warningBlock());
    const homeView = homeViewSummary(blockArray);
    return JSON.stringify(homeView);
};