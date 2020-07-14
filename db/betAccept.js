var TinyDB = require("tinydb");
const db = new TinyDB("./betAccept.db");

db.onReady = function () {
  console.log("Bet Accept database is ready for operating");
};

exports.getBetAcceptById = (betAcceptId) => {
  let existingBetAccept = null;
  db.find({
      _id: betAcceptId,
    },
    (err, results) => {
      if (results && results.length > 0) {
        existingBetAccept = results[0];
      }
    }
  );
  return existingBetAccept;
};

exports.getAllBetAcceptsForUser = (slackUser) => {
  let existingBetAccepts = [];
  db.find({
      userId: slackUser,
    },
    (err, results) => {
      if (results && results.length > 0) {
        existingBetAccepts = results;
      }
    }
  );
  return existingBetAccepts;
};

exports.addBetAccept = (betId, userId, channelId, walletId, pointsBet) => {
  let existingBetAccept = null;
  //TODO transfer points from wallet to bet
  db.insertItem({
      betId: betId,
      userId: userId,
      channelId: channelId,
      walletId: walletId,
      pointsBet: pointsBet,
      dateAccepted: Date.now()
    },
    null,
    (err, results) => {
      existingBetAccept = results;
    }
  );
  return existingBetAccept;
};

exports.save = () => {
  db.flush();
};