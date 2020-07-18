# slack-bookie

This is a slack app that facilitates individuals placing bets using imaginary points. It should be able to be installed to any workspace. It uses nodejs and the bolt framework. It uses tinyDb for a database.

# Getting Started Locally
 - Install [Visual Studio Code](https://code.visualstudio.com/download)
 - Clone this repo
 - Create a slack app in slack following [this guide](https://api.slack.com/tutorials/hello-world-bolt)
   - You can ignore everything about using glitch, but you'll have to manually create the .env file in your root directory of the cloned repo
 - Download and install [nodejs](https://nodejs.org/en/download/)
 
 - In VSCode, open the repo root folder, then open the terminal tab and run the command `npm install`
 - In VSCode, hit F5 or Run -> Start Debugging. Choose Node.js

 - Download [ngrok](https://ngrok.com/download). Put the file somewhere convenient as you'll want to call it from the vscode terminal.
   - I made an account on their site. I don't think it's necessary, but it sounds like if you don't make an account, your tunnel will timeout after awhile.
   - If you create an account, go through [this setup](https://dashboard.ngrok.com/get-started/setup) to link your local instance.

 - In VSCode terminal, navigate to folder with ngrok.exe and run command `./ngrok http 3000`
   - It should create the tunnel and print out your ngrok.io url (both http and https versions)
 - In your slack.com app configuration, set your event subscription url to `https://[my ngrok.io url]/slack/events`
   - Your node server must be running for slack to verify this url.

# Additional Configuration
The steps above will get your server running and you'll be able to hit a breakpoint when visiting the home tab of your app in slack. However, there are several more configurations that need to be set up to get all the functionality that exists in the app.

## .env variables
 - `SLACK_BOT_ID`: Your slack bot id
   - This is a pain to get. The easiest way I've found is to use the tester on [this page](https://api.slack.com/methods/conversations.members/test)
     - For the token field, plug in your Bot User OAuth Access Token from the OAuth & Permissions page of your slack app config.
     - For the channel field, open a conversation with your bot in slack in a browser. The url should look something like https://app.slack.com/client/[teamid]/[channelid]/app/thread
     - When you hit Test Method, you should get back a list of two member ids. The first one should be the bot.
 - `COMMAND_PREFIX`: A prefix of your choosing. Only necessary if you'll be running multiple instances of the app in the same slack workspace. Useful for development. Leave blank for the main instance.
   - The prefix is only used so that each instance of the app can have its own set of slash commands, but still run the same code.
  
## Slack App Subscribe to events
In the initial setup, you should have already subscribed to `app_home_opened` under the `Subscribe to events on behalf of users` section. You will also need to subscribe to the following events under the `Subscribe to bot events` section:
 - message.channels
 - message.groups
 - message.im
 - message.mpim
 - reaction_added
 - member_joined_channel
   
## Slack App Additional Oauth needs
Go to the OAuth & Permissions section of the slack app and add the following oauth scopes.
 - channels:read
 - groups:read
 - im:read
 - mpim:read
 - users:read
 
## Slack App Slash Commands
On the slash commands page of the slack app configuration, create the following slash commands. All of them should use the exact same url you used previously in the event subscriptions.
 - /[prefix]bookie-bet
   - The command to create a bet
 - /[prefix]bookie-channel-reset
   - Triggers a vote to reset the channel
 - /[prefix]bookie-leaderboard
   - Posts a leaderboard to the channel
 - /[prefix]bookie-more-points
   - Triggers a vote to give everyone in the channel more points
   
## Slack App Interactivity & Shortcuts
Go to this page in the slack app configuration and simply enable Interactivity. Set the request url to be the same that you used for event subscriptions and slash commands.

## Slack emojis
The app expects the following emojis to exist in the slack workspace. If you don't have them, you can either create them, or seek out the code that references them and change it to something else. Hopefully in the future, these will be more easily configured
 - :yes: (used for yes votes)
 - :no: (used for no votes)
 - :notsureif: (used for votes of inconclusive results)
 - :cancel: (used to display canceled status)
 - :closed_book: (used to display closed status)
 - :done1: (used to display finished status)
 - :in-progress: (used to display open status)
