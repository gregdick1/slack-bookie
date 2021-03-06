var TinyDB = require("tinydb");
const db = new TinyDB("./bet.db");

db.onReady = function () {
  console.log("Bet database is ready for operating");
};

const addPostUrl = (bet) => {
  if (bet) {
    bet.postUrl = `https://hudl.slack.com/archives/${bet.channelId}/p${bet.postId}`;
  }
  return bet;
};

const addPostUrls = (bets) => {
  bets.forEach((bet) => addPostUrl(bet));
  return bets;
};

exports.getBetById = (betId) => {
  let existingBet = null;
  db.find(
    {
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
  db.find(
    {
      userId: slackUser,
    },
    (err, results) => {
      if (results && results.length > 0) {
        existingBets = results;
      }
    }
  );
  return addPostUrls(existingBets);
};

exports.getUserBetsForChannel = (userId, channelId, walletId) => {
  let existingBets = null;
  db.find(
    {
      userId: userId,
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

exports.getUnfinishedBetsForChannel = (channelId) => {
  let existingBets = []
  db.find(
    {
      channelId: channelId,
      status: this.statusOpen,
    },
    (err, results) => {
      if (results) {
        existingBets.push(...results);
      }
    }
  );
  db.find(
    {
      channelId: channelId,
      status: this.statusClosed,
    },
    (err, results) => {
      if (results) {
        existingBets.push(...results);
      }
    }
  );
  return existingBets;
}

exports.getBetByUserChannelScenario = (
  userId,
  channelId,
  walletId,
  scenarioText
) => {
  let existingBet = null;
  db.find(
    {
      userId: userId,
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
  db.find(
    {
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
  userId,
  channelId,
  walletId,
  scenarioText,
  pointsBet,
  odds,
  postId
) => {
  db.insertItem(
    {
      userId: userId,
      channelId: channelId,
      walletId: walletId,
      scenarioText: scenarioText,
      pointsBet: pointsBet,
      postId: postId,
      dateCreated: Date.now(),
      status: this.statusOpen,
      odds,
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

exports.setBetStatus = (betId, status) => {
  if (allBetStatuses.indexOf(status) < 0) {
    throw new Error("Invalid bet status");
  }

  db.find(
    {
      _id: betId,
    },
    (err, results) => {
      if (results !== undefined) {
        const bet = results[0];
        bet.status = status;
        db.flush();
        return bet;
      } else {
        return undefined;
      }
    }
  );
};

exports.statusOpen = "open";
exports.statusClosed = "closed";
exports.statusFinished = "finished";
exports.statusCanceled = "canceled";
exports.outcomeCreatorWon = "yes";
exports.outcomeCreatorLost = "no";

const allBetStatuses = [this.statusOpen, this.statusClosed, this.statusFinished, this.statusCanceled];