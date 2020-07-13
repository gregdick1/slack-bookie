var TinyDB = require("tinydb");
const db = new TinyDB("./mobVote.db");

db.onReady = function () {
  console.log("mobVote database is ready for operating");

  // set info to DB
  db.setInfo("title", "MobVote DB", function (err, key, value) {
    if (err) {
      console.log(err);
      return;
    }

    console.log("[setInfo] " + key + " : " + value);
  });

  // get info from DB
  db.getInfo("title", function (err, key, value) {
    if (err) {
      console.log(err);
      return;
    }

    console.log("[getInfo] " + key + " : " + value);
  });
};

exports.createMobVote = (channelId, postId, type, lockoutTime, votesNeeded) => {
  db.insertItem({
    channelId: channelId,
    postId: postId,
    type: type,
    lockoutTime: lockoutTime,
    votesNeeded: votesNeeded,
    handled: false,
  });
};

exports.getMobVote = (channelId, postId, type) => {
  let vote = null;
  db.find(
    { channelId: channelId, postId: postId, type: type },
    (err, results) => {
      if (results !== undefined) {
        vote = results[0];
      }
    }
  );
  return vote;
};

exports.save = () => {
  db.flush();
};
