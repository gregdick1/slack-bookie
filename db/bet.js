var TinyDB = require("tinydb");
const db = new TinyDB("./bet.db");

db.onReady = function () {
  console.log("Bet database is ready for operating");
};

const addPostUrl = (bet) => {
  bet.postUrl = `https://hudl.slack.com/archives/${bet.channelId}/p${bet.postId}`;
  return bet;
};

const addPostUrls = (bets) => {
  bets.forEach(bet => addPostUrl(bet));
  return bets;
};

exports.getBetById = (betId) => {
  let existingBet = null;
  db.find({
      _id: betId,
    },
    (err, results) => {
      if (results && results.length > 0) {
        existingBet = results[0];
      }
    }
  );
  return addPostUrl(existingBet);
};

exports.getAllBetsForUser = (slackUser) => {
  let existingBets = [];
  db.find({
      slackId: slackUser,
    },
    (err, results) => {
      if (results && results.length > 0) {
        existingBets = results;
      }
    }
  );
  return addPostUrls(existingBets);
};

exports.getUserBetsForChannel = (slackId, channelId, walletId) => {
  let existingBets = null;
  db.find({
      slackId: slackId,
      channelId: channelId,
      walletId: walletId,
    },
    (err, results) => {
      if (results) {
        existingBets = results;
      }
    }
  );
  return addPostUrls(existingBets);
};

exports.getBetByUserChannelScenario = (
  slackId,
  channelId,
  walletId,
  scenarioText
) => {
  let existingBet = null;
  db.find({
      slackId: slackId,
      channelId: channelId,
      walletId: walletId,
      scenarioText: scenarioText,
    },
    (err, results) => {
      if (results && results.length > 0) {
        existingBet = results[0];
      }
    }
  );
  return addPostUrl(existingBet);
};

exports.getBetByPostId = (channelId, postId) => {
  let existingBet = null;
  db.find({
      channelId: channelId,
      postId: postId,
    },
    (err, results) => {
      if (results && results.length > 0) {
        existingBet = results[0];
      }
    }
  );
  return addPostUrl(existingBet);
};

exports.addBet = (
  slackId,
  channelId,
  walletId,
  scenarioText,
  pointsBet,
  postId
) => {
  let existingBet = this.getBetByUserChannelScenario(
    slackId,
    channelId,
    walletId,
    scenarioText
  );
  if (existingBet !== null) {
    console.log("WHOA PARTNER. ALREADY A BET LIKE THIS");
    return existingBet;
  }
  //TODO transfer points from wallet to bet
  db.insertItem({
      slackId: slackId,
      channelId: channelId,
      walletId: walletId,
      scenarioText: scenarioText,
      pointsBet: pointsBet,
      postId: postId,
      dateCreated: Date.now(),
    },
    null,
    (err, results) => {
      existingBet = results;
    }
  );
  return existingBet;
};

exports.save = () => {
  db.flush();
};