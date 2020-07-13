const axios = require("axios");
const qs = require("qs");

const apiBase = 'https://slack.com/api';
const DEBUG_MODE = true;
const mockData = {
    betTotal: 4,
    bets: [{
        betId: 1,
        amount: 100,
        description: 'asdf1',
        other: 'other1',
    }, {
        betId: 2,
        amount: 600,
        description: 'asdf2',
        other: 'other2',
    }, {
        betId: 3,
        amount: 200,
        description: 'asdf3',
        other: 'other3',
    }, {
        betId: 4,
        amount: 500,
        description: 'asdf4',
        other: 'other4',
    }]
};

exports.displayHome = async (slackUser, user) => {
    const args = {
        token: process.env.SLACK_BOT_TOKEN,
        user_id: slackUser,
        view: await updateView(slackUser, user),
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

const sumPoints = (bets) => {
    return bets.reduce((a, b) => a + (b['amount'] || 0), 0);
};

const summaryBlock = (mockData) => {
    return {
        type: "section",
        text: {
            type: "mrkdwn",
            text: `You're currently involved in ${mockData.betTotal} bets for a total of ${sumPoints(mockData.bets)} points`
        },
    };
};

const betSummaryView = (bet) => {
    return {
        type: "section",
        fields: [{
                type: "mrkdwn",
                text: `*Bet ID:* ${bet.betId}`
            },
            {
                type: "mrkdwn",
                text: `*Amount:* ${bet.amount}`
            }, {
                type: "mrkdwn",
                text: `*Description:* ${bet.description}`
            }, {
                type: "mrkdwn",
                text: `*something else?:* ${bet.other}`
            },
        ],
    };
};

const betActionView = (bet) => {
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
            action_id: "doAThing",
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

const updateView = async (slackUser, user) => {
    let blockArray = [];
    blockArray.push(welcomeBlock(slackUser));
    blockArray.push(dividerBlock);
    blockArray.push(warningBlock);
    blockArray.push(dividerBlock);
    blockArray.push(summaryBlock(mockData));
    blockArray.push(dividerBlock);
    for (let i = 0; i < mockData.bets.length; i++) {
        const bet = mockData.bets[i];
        blockArray.push(betSummaryView(bet));
        blockArray.push(betActionView(bet));
        blockArray.push(dividerBlock);
    }

    const homeView = homeViewSummary(blockArray);
    return JSON.stringify(homeView);
};