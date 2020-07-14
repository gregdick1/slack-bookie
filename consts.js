require("dotenv").config();

exports.defaultPoints = 1000;
exports.botId = process.env.SLACK_BOT_ID;
exports.commandPrefix = process.env.COMMAND_PREFIX;
