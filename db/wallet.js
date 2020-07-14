var TinyDB = require("tinydb");
const db = new TinyDB("./wallet.db");

db.onReady = function () {
  console.log("wallet database is ready for operating");

  // set info to DB
  db.setInfo("title", "Wallet DB", function (err, key, value) {
    if (err) {
      console.log(err);
      return;
    }
  });

  // get info from DB
  db.getInfo("title", function (err, key, value) {
    if (err) {
      console.log(err);
      return;
    }
  });
};

exports.getCurrentSeason = (channelId) => {
  let latestSeason = 0;
  db.find(
    {
      channelId: channelId,
    },
    (err, results) => {
      if (results !== undefined) {
        results.forEach((item, idx) => {
          if (item.season > latestSeason) {
            latestSeason = item.season;
          }
        });
      }
    }
  );
  return latestSeason;
};

exports.getWalletById = (walletId) => {
  let existingWallet = null;
  db.find(
    {
      _id: walletId,
    },
    (err, results) => {
      if (results && results.length > 0) {
        existingWallet = results[0];
      }
    }
  );
  return existingWallet;
};

exports.getWallet = (channelId, slackId) => {
  let existingWallet = null;
  const season = this.getCurrentSeason(channelId);
  db.find(
    {
      slackId: slackId,
      channelId: channelId,
      season: season,
    },
    (err, results) => {
      existingWallet = results[0];
    }
  );
  return existingWallet;
};

exports.getWalletForSeason = (channelId, slackId, season) => {
  let existingWallet = null;
  db.find(
    {
      slackId: slackId,
      channelId: channelId,
      season: season,
    },
    (err, results) => {
      if (results !== undefined) {
        existingWallet = results[0];
      }
    }
  );
  return existingWallet;
};

exports.getAllWalletsForUser = (slackId, includeRetired) => {
  let allWalletsForUser = null;
  db.find(
    {
      slackId: slackId,
    },
    (err, results) => {
      if (results !== undefined) {
        allWalletsForUser = results;
      } else {
        return [];
      }
    }
  );
  if (!includeRetired) {
    allWalletsForUser = allWalletsForUser.filter((w) => !w.retired);
  }
  for (let i = 0; i < allWalletsForUser.length; i++) {
    const wal = allWalletsForUser[i];
    const currentSeason = this.getCurrentSeason(wal.channelId);
    wal.isActiveSeason = wal.season === currentSeason;
    wal.betsAreActive = wal.isActiveSeason && !wal.retired;
  }
  return allWalletsForUser;
};

exports.retireWallet = (walletId) => {
  let wallet = this.getWalletById(walletId);
  if (!wallet) {
    throw "Can't update a wallet that doesn't exist";
  }
  wallet.retired = true;
  db.flush();
  return wallet;
};

exports.addWallet = (channelId, slackId, points, season) => {
  let existingWallet = this.getWalletForSeason(channelId, slackId, season);
  if (existingWallet !== null) {
    return existingWallet;
  }
  db.insertItem(
    {
      slackId: slackId,
      channelId: channelId,
      points: points,
      season: season,
      retired: false,
      initialPointBalance: points,
    },
    null,
    (err, results) => {
      existingWallet = results;
    }
  );
  return existingWallet;
};

exports.save = () => {
  db.flush();
};

exports.getAllWalletsForSeason = (channelId, season, includeRetired) => {
  let allWallets = [];
  db.find(
    {
      channelId,
      season,
    },
    (err, results) => {
      if (results !== undefined) {
        allWallets = results;
      } else {
        return [];
      }
    }
  );
  if (!includeRetired && allWallets && allWallets.length) {
    allWallets = allWallets.filter((w) => !w.retired);
  }
  return allWallets;
};

exports.updateBalance = (walletId, amount) => {
  db.find(
    {
      _id: walletId,
    },
    (err, results) => {
      if (results !== undefined) {
        const wallet = results[0];
        wallet.points += amount;
        db.flush();
        return wallet;
      } else {
        return undefined;
      }
    }
  );
};
