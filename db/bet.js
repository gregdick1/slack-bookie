var TinyDB = require('tinydb');
const db = new TinyDB('./bet.db');

db.onReady = function () {
  console.log('Bet database is ready for operating');

  // set info to DB
  db.setInfo('title', 'Bet DB', function (err, key, value) {
    if (err) {
      console.log(err);
      return;
    }

    console.log('[setInfo] ' + key + ' : ' + value);
  });

  // get info from DB
  db.getInfo('title', function (err, key, value) {
    if (err) {
      console.log(err);
      return;
    }

    console.log('[getInfo] ' + key + ' : ' + value);
  });

  // do other things below
  db.forEach(function (err, item) {
    if (err) {
      console.log(err);
      return;
    }

    for (var key in item) {
      console.log(key + ' : ' + item[key]);
    }
  });
};

exports.getBetById = (betId) => {
  let existingBet = null;
  db.find({
    _id: betId
  }, (err, results) => {
    if (results && results.length > 0) {
      existingBet = results[0];
    }
  });
  return existingBet;
};

exports.getUserBetsForChannel = (slackId, channelId, walletId) => {
  let existingBets = null;
  db.find({
    slackId: slackId,
    channelId: channelId,
    walletId: walletId,
  }, (err, results) => {
    if (results) {
      existingBets = results;
    }
  });
  return existingBets;
};

exports.getBetByUserChannelScenario = (slackId, channelId, walletId, scenarioText) => {
  let existingBet = null;
  db.find({
    slackId: slackId,
    channelId: channelId,
    walletId: walletId,
    scenarioText: scenarioText,
  }, (err, results) => {
    if (results && results.length > 0) {
      existingBet = results[0];
    }
  });
  return existingBet;
};

exports.addBet = (slackId, channelId, walletId, scenarioText, pointsBet) => {
  let existingBet = this.getBetByUserChannelScenario(slackId, channelId, walletId, scenarioText);
  if (existingBet !== null) {
    console.log("WHOA PARTNER. ALREADY A BET LIKE THIS");
    return;
  }
  db.insertItem({
    slackId: slackId,
    channelId: channelId,
    walletId: walletId,
    scenarioText: scenarioText,
    pointsBet: pointsBet
  });
};

exports.save = () => {
  db.flush();
};