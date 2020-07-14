const axios = require("axios");
const qs = require("qs");
const walletDB = require("./db/wallet");

const apiBase = "https://slack.com/api";
const DEBUG_MODE = true;

exports.displayHome = async (slackUser, channelId, walletsForUser, allBetsForUser) => {
    const args = {
        token: process.env.SLACK_BOT_TOKEN,
        user_id: slackUser,
        view: await updateView(slackUser, channelId, walletsForUser, allBetsForUser),
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
    for (let i = 0; i < walletsForUser.length; i++) {
        const wal = walletsForUser[i];
        const currentSeason = walletDB.getCurrentSeason(wal.channelId);
        wal.isActiveSeason = wal.season === currentSeason;
    }
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

const betSummaryView = (bet) => {
    return {
        type: "section",
        fields: [{
                type: "mrkdwn",
                text: `*BetID:* ${bet._id}`,
            },
            {
                type: "mrkdwn",
                text: `*Points:* ${bet.pointsBet}`,
            },
            {
                type: "mrkdwn",
                text: `*Scenario Text:* ${bet.scenarioText}`,
            }
        ]
    };
}

const walletSummaryView = (wallet) => {
    return {
        type: "section",
        fields: [{
                type: "mrkdwn",
                text: `*WalletID:* ${wallet._id}`,
            },
            {
                type: "mrkdwn",
                text: `*Channel:* <#${wallet.channelId}>`,
            },
            {
                type: "mrkdwn",
                text: `*Scenario:* ${wallet.points}`,
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
    let betsForWallet = [];
    for (let i = 0; i < allBetsForUser.length; i++) {
        const betForUser = allBetsForUser[i];
        if (betForUser.walletId === walletId) {
            betsForWallet.push(betForUser);
        }
    }
    return betsForWallet;
}

const updateView = async (slackUser, channelId, walletsForUser, allBetsForUser) => {
    let blockArray = [];
    if (DEBUG_MODE) {
        blockArray.push(setMeUpView(channelId));
    }
    blockArray.push(welcomeBlock(slackUser));
    blockArray.push(dividerBlock);
    if (walletsForUser) {
        blockArray.push(summaryBlock(walletsForUser, allBetsForUser));
        blockArray.push(dividerBlock);
        for (let i = 0; i < walletsForUser.length; i++) {
            const wallet = walletsForUser[i];
            const betsForThisWallet = getBetsForWallet(allBetsForUser, wallet._id);
            console.log(betsForThisWallet);
            blockArray.push(walletSummaryView(wallet));
            if (betsForThisWallet && betsForThisWallet.length > 0) {
                blockArray.push({
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "Here are the bets associated with this wallet:",
                    },
                });
                for (let j = 0; j < betsForThisWallet.length; j++) {
                    const thisBet = betsForThisWallet[j];
                    blockArray.push(betSummaryView(thisBet));
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