const axios = require("axios");
const qs = require("qs");

const apiBase = 'https://slack.com/api';
const DEBUG_MODE = true;

exports.displayHome = async (slackUser, walletsForUser) => {
    const args = {
        token: process.env.SLACK_BOT_TOKEN,
        user_id: slackUser,
        view: await updateView(slackUser, walletsForUser),
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
    type: "divider"
};

const welcomeBlock = (slackUser) => {
    return {
        type: "section",
        text: {
            type: "mrkdwn",
            // todo change to user's name?
            text: `Welcome <@${slackUser}> ${DEBUG_MODE ? new Date().toLocaleTimeString() : ""}`
        },
    };
};

const warningBlock = {
    type: "section",
    text: {
        type: "mrkdwn",
        text: "This is a slack bot that facilitates gambling. Gambling can be fun, but can also be dangerous. Only gamble what you're willing to lose.\r\n\r\nThe National Council on Problem Gambling Helpline offers a confidential, 24-hour helpline for problem gamblers or their family members at 1-800-522-4700"
    },
    accessory: {
        type: "image",
        image_url: "https://www.bestuscasinos.org/wp-content/uploads/2019/12/Gambling-Mistake-1.jpg",
        alt_text: "This is what happens when you gamble"
    }
};

const sumPoints = (walletsForUser) => {
    return walletsForUser.reduce((a, b) => a + (b['points'] || 0), 0);
};

const summaryBlock = (walletsForUser) => {
    return {
        type: "section",
        text: {
            type: "mrkdwn",
            text: `You currently have ${walletsForUser.length} wallets with a total of ${sumPoints(walletsForUser)} points`
        },
    };
};

const walletSummaryView = (wallet) => {
    return {
        type: "section",
        fields: [{
                type: "mrkdwn",
                text: `*WalletID:* ${wallet._id}`
            },
            {
                type: "mrkdwn",
                text: `*Channel:* <#${wallet.channelId}>`
            }, {
                type: "mrkdwn",
                text: `*Points:* ${wallet.points}`
            },
            {
                type: "mrkdwn",
                text: `*Season:* ${wallet.season}`
            },
        ],
    };
};

const walletActionView = (wallet) => {
    return {
        type: "actions",
        elements: [{
            type: "button",
            text: {
                type: "plain_text",
                emoji: true,
                text: "Do a thing",
            },
            style: "primary",
            action_id: "clymer_test",
        }]
    };
};

const homeViewSummary = (blockArray) => {
    return {
        type: "home",
        title: {
            type: "plain_text",
            text: "Gambling is dangerous",
        },
        blocks: blockArray,
    };
}

const updateView = async (slackUser, walletsForUser) => {
    let blockArray = [];
    blockArray.push(welcomeBlock(slackUser));
    blockArray.push(dividerBlock);
    blockArray.push(warningBlock);
    blockArray.push(dividerBlock);
    blockArray.push(summaryBlock(walletsForUser));
    blockArray.push(dividerBlock);
    for (let i = 0; i < walletsForUser.length; i++) {
        const wallet = walletsForUser[i];
        blockArray.push(walletSummaryView(wallet));
        blockArray.push(walletActionView(wallet));
        blockArray.push(dividerBlock);
    }

    const homeView = homeViewSummary(blockArray);
    return JSON.stringify(homeView);
};