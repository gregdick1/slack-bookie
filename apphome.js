const axios = require("axios");
const qs = require("qs");
const walletDB = require("./db/wallet");

const apiBase = "https://slack.com/api";
const DEBUG_MODE = true;

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
        .post(`${apiBase}/views.publish`, qs.stringify(args))
        .then(function (response) {
            console.log(response);
        })
        .catch(function (error) {
            console.log(error);
        });
};

const dividerBlock = {
    type: "divider",
};


const welcomeBlock = (slackUser) => {
    return {
        type: "section",
        text: {
            type: "mrkdwn",
            // todo change to user's name?
            text: `${DEBUG_MODE ? new Date().toLocaleTimeString() : ""}
            
A *wallet* is specific to a channel. If a channel isn't setup yet, type '@bookie Let's gamble!'

After that, here are some things you can do:
- 1 fun thing
* another fun thing`,
        },
    };
};

const warningBlock = {
    type: "section",
    text: {
        type: "mrkdwn",
        text: "This is a slack bot that facilitates gambling. Gambling can be fun, but can also be dangerous. Only gamble what you're willing to lose.\r\n\r\nThe National Council on Problem Gambling Helpline offers a confidential, 24-hour helpline for problem gamblers or their family members at 1-800-522-4700",
    },
    accessory: {
        type: "image",
        image_url: "https://www.bestuscasinos.org/wp-content/uploads/2019/12/Gambling-Mistake-1.jpg",
        alt_text: "This is what happens when you gamble",
    },
};

const sumThing = (arrayToSum, propToSum) => {
    return !arrayToSum ? 0 : arrayToSum.reduce((a, b) => a + (b[propToSum] || 0), 0);
};

const summaryBlock = (walletsForUser, betsForUser) => {
    const betCount = betsForUser ? betsForUser.length : 0;
    const activeWallets = walletsForUser.filter(w => w.isActiveSeason);
    const inactiveWallets = walletsForUser.filter(w => !w.isActiveSeason);
    const activeWalletCount = activeWallets ? activeWallets.length : 0;
    const inactiveWalletCount = inactiveWallets ? inactiveWallets.length : 0;
    const activeWalletPoints = sumThing(activeWallets, "points");
    const inactiveWalletPoints = sumThing(inactiveWallets, "points");
    const totalBetPoints = sumThing(betsForUser, "pointsBet");
    return {
        type: "section",
        text: {
            type: "mrkdwn",
            text: `*Summary*
You have ${activeWalletCount} active wallets with a total of ${activeWalletPoints} points.
You have ${inactiveWalletCount} inactive wallets with a total of ${inactiveWalletPoints} points.
You have ${betCount} outstanding bets for a total of ${totalBetPoints} points.
`,
        },
    };
};

const strikethroughIfInactive = (strikeIfMeTrue, stringToStrike) => {
    return `${strikeIfMeTrue ? '~' : ''}${stringToStrike}${strikeIfMeTrue ? '~' : ''}`;
}

const betSummaryView = (bet, wallet) => {
    const dateCreatedString = bet.dateCreated ? new Date(bet.dateCreated).toLocaleString() : "?";
    return {
        type: "section",
        fields: [{
                type: "mrkdwn",
                text: `*BetID:* ${strikethroughIfInactive(!wallet.betsAreActive, bet._id)}`,
            },
            {
                type: "mrkdwn",
                text: `*Points:* ${strikethroughIfInactive(!wallet.betsAreActive, bet.pointsBet)}`,
            },
            {
                type: "mrkdwn",
                text: `*Scenario Text:* ${bet.scenarioText}`,
            }, {
                type: "mrkdwn",
                text: `*Bet Created:* ${dateCreatedString}`,
            }
        ]
    };
};

const betAcceptSummaryView = (betAccept, wallet) => {
    const dateAcceptedString = betAccept.dateAccepted ? new Date(betAccept.dateAccepted).toLocaleString() : "?";
    return {
        type: "section",
        fields: [{
                type: "mrkdwn",
                text: `*BetAcceptId:* ${strikethroughIfInactive(!wallet.betsAreActive, betAccept._id)}`,
            },
            {
                type: "mrkdwn",
                text: `*Points:* ${strikethroughIfInactive(!wallet.betsAreActive, betAccept.pointsBet)}`,
            },
            {
                type: "mrkdwn",
                text: `*Bet Id:* ${betAccept.betId}`,
            }, {
                type: "mrkdwn",
                text: `*Bet Created:* ${dateAcceptedString}`,
            }
        ]
    };
}

const walletSummaryView = (wallet) => {
    return {
        type: "section",
        fields: [{
                type: "mrkdwn",
                text: `*WalletID:* ${strikethroughIfInactive(!wallet.betsAreActive,wallet._id)}`,
            },
            {
                type: "mrkdwn",
                text: `*Channel:* <#${wallet.channelId}>`,
            },
            {
                type: "mrkdwn",
                text: `*Points:* ${strikethroughIfInactive(!wallet.betsAreActive,wallet.points)}`,
            },
            {
                type: "mrkdwn",
                text: `*Season:* ${wallet.season}`,
            }, {
                type: "mrkdwn",
                text: `*Retired:* ${wallet.retired ? true : false}`,
            }, {
                type: "mrkdwn",
                text: `*Is Active:* ${wallet.isActiveSeason ? true : false}`,
            },
        ],
    };
};

const walletActionView = (wallet) => {
    return {
        type: "actions",
        block_id: wallet._id,
        elements: [{
            type: "button",
            text: {
                type: "plain_text",
                emoji: true,
                text: "Retire Wallet",
            },
            style: "danger",
            action_id: "retire_wallet",
        }, ],
    };
};

const setMeUpView = (channelId) => {
    return {
        type: "actions",
        block_id: channelId,
        elements: [{
            type: "button",
            text: {
                type: "plain_text",
                emoji: true,
                text: "Set Me Up With Some DB",
            },
            style: "primary",
            action_id: "set_me_up_fam",
        }],
    };
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

const walletSortFunc = (a, b) => {
    if (a.isActiveSeason > b.isActiveSeason) {
        return -1; // a = active, b = not. active seasons first
    } else if (a.isActiveSeason < b.isActiveSeason) {
        return 1; // a = not, b = active, active seasons first
    } else if (!!a.retired < !!b.retired) {
        return -1; // a = not, b = retired, notretired first
    } else if (!!a.retired > !!b.retired) {
        return 1; // a = retired, b = not, notretired first
    } else {
        // if a has more points than b, it should be first
        return b.points - a.points;
    }
}

const betSortFunc = (a, b) => {
    return a.dateCreated > b.dateCreated;
}

const betAcceptSortFunc = (a, b) => {
    return a.dateAccepted > b.dateAccepted;
}

const getBetAcceptsForBet = (allBetAcceptsForUser, betId) => {
    return allBetAcceptsForUser.filter(ba => ba.betId == betId);
}

const getBetAcceptsForWallet = (allBetAcceptsForUser, walletId) => {
    return allBetAcceptsForUser.filter(ba => ba.walletId == walletId);
}

const updateView = async (slackUser, channelId, walletsForUser, allBetsForUser, allBetAcceptsForUser) => {
    let blockArray = [];
    if (DEBUG_MODE) {
        blockArray.push(setMeUpView(channelId));
    }
    blockArray.push(welcomeBlock(slackUser));
    blockArray.push(dividerBlock);
    if (walletsForUser) {
        blockArray.push(summaryBlock(walletsForUser, allBetsForUser));
        blockArray.push(dividerBlock);
        walletsForUser.sort(walletSortFunc);
        for (let i = 0; i < walletsForUser.length; i++) {
            const wallet = walletsForUser[i];
            const betsForThisWallet = getBetsForWallet(allBetsForUser, wallet._id);
            const betAcceptsForThisWallet = getBetAcceptsForWallet(allBetAcceptsForUser, wallet._id);
            if (betAcceptsForThisWallet.length > 0) {
                // do nothing;
                var x = 1 + 1;
            }
            blockArray.push(walletSummaryView(wallet));
            if (betsForThisWallet && betsForThisWallet.length > 0) {
                blockArray.push({
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `Here are your created bets in <#${wallet.channelId}>:`,
                    },
                });
                betsForThisWallet.sort(betSortFunc);
                for (let j = 0; j < betsForThisWallet.length; j++) {
                    const thisBet = betsForThisWallet[j];
                    // TODO This should be bet accepts for OTHER users
                    //const betAcceptsForUserForThisBet = getBetAcceptsForBet(allBetAcceptsForUser, thisBet._id);
                    //console.log(betAcceptsForUserForThisBet);
                    blockArray.push(betSummaryView(thisBet, wallet));
                }
            }
            if (betAcceptsForThisWallet && betAcceptsForThisWallet.length > 0) {
                blockArray.push({
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `Here are your accepted bets for <#${wallet.channelId}>:`,
                    },
                });
                betAcceptsForThisWallet.sort(betAcceptSortFunc);
                for (let j = 0; j < betAcceptsForThisWallet.length; j++) {
                    const thisBetAccept = betAcceptsForThisWallet[j];
                    blockArray.push(betAcceptSummaryView(thisBetAccept, wallet));
                }
            }
            blockArray.push(walletActionView(wallet));
            blockArray.push(dividerBlock);
        }
    }
    blockArray.push(warningBlock);
    const homeView = homeViewSummary(blockArray);
    return JSON.stringify(homeView);
};