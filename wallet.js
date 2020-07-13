var TinyDB = require('tinydb');
const db = new TinyDB('./wallet.db');

db.onReady = function() {
    console.log('wallet database is ready for operating');

    // set info to DB
    db.setInfo('title', 'Wallet DB', function(err, key, value) {
    if (err) {
      console.log(err);
      return;
    }
    
    console.log('[setInfo] ' + key + ' : ' + value);
  });
  
  // get info from DB
  db.getInfo('title', function(err, key, value) {
    if (err) {
      console.log(err);
      return;
    }
    
    console.log('[getInfo] ' + key + ' : ' + value);
  });
}

exports.getCurrentSeason = (channelId) => {
    let latestSeason = 0;
    db.find({channelId: channelId}, (err, results) => {
        results.forEach((item, idx) => {
            if (item.season > latestSeason) {
                latestSeason = item.season;
            }
        })
    });
    return latestSeason;
}

exports.getWallet = (channelId, slackId) => {
    let existingWallet = null
    const season = this.getCurrentSeason(channelId);
    db.find({slackId: slackId, channelId: channelId, season: season}, (err, results) => {
        existingWallet = results[0];
    });
    return existingWallet;
}

exports.getWalletForSeason = (channelId, slackId, season) => {
    let existingWallet = null
    db.find({slackId: slackId, channelId: channelId, season: season}, (err, results) => {
        if (results !== undefined) {
            existingWallet = results[0];
        }
    });
    return existingWallet;
}

exports.addWallet = (channelId, slackId, points, season) => {
    let existingWallet = this.getWalletForSeason(channelId, slackId, season);
    if (existingWallet !== null) {
        return;
    }
    db.insertItem({slackId: slackId, channelId: channelId, points: points, season: season});
}

exports.save = () => {
    db.flush();
}

