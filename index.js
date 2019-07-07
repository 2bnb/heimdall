const {Client, RichEmbed} = require('discord.js');
var auth = require('./auth.json');
// Initialize Discord Bot
var bot = new Client();

bot.on('ready', function (evt) {
	console.log('Bot ready');
});

function formatHelp(command) {
	var helpArray = (require('./data.json')).helpArray;

	var result = '';
	if (command == '') {
		for (let [key, value] of Object.entries(helpArray)) {
			result += '**!' + key + '**: ' + value + '\n';
		}
	} else {
		console.log(Object.keys(helpArray).indexOf(command), command);
		if (Object.keys(helpArray).indexOf(command) > -1) {
			result = '**!' + command + '**: ' + helpArray[command];
		} else {
			result = 'That command was not found';
		}
	}

	return result;
}

bot.on('message', message => {
	// Our bot needs to know if it will execute a command
	// It will listen for messages that will start with `!`
	if (message.content.substring(0, 1) == '!') {
		var args = message.content.substring(1).split(' ');
		var cmd = args[0];

		args = args.splice(1);
		switch(cmd) {
			// Command: `!help`
			// Description: Display available commands, or the help for a single command
			// 		if specified
			// Use: `!help [command]`
			// Author: Arend
			case 'help':
				var embed = new RichEmbed()
					.setTitle('Heimdall\'s help')
					.setColor(0xFF0000)
					.setDescription(
						formatHelp(message.content.substring(6))
					);
				message.channel.send(embed);
				break;

			// Command: `!ping`
			// Description: Send "Pong!"
			// Use: `!ping`
			// Author: Arend
			case 'ping':
				var pings = ['Pong!', 'Whoosh!', 'Ouch!'];
				message.channel.send(pings[Math.floor(Math.random() * (pings.length - 0)) + 0]);
				break;

			// Command: `!say`
			// Description: Display the given message
			// Use: `!say [message]`
			// Author: Arend
			case 'say':
				message.channel.send(message.content.substring(4));
				break;

			// Command: `!embed`
			// Description: Display the given content as an embedded message
			// Use: `!embed The Title goes before - And the Description goes after`
			// Author: Arend
			case 'embed':
				var embed = new RichEmbed()
					.setTitle(message.content.substring(6, message.content.indexOf('-')))
					.setColor(0xFF0000)
					.setDescription(message.content.substring(message.content.indexOf('-') + 1));
				message.channel.send(embed);
				break;
			case 'start':
				var service = message.content.substring(message.content.indexOf(' '));
			default:
				message.channel.send('Speak up you laggard!');
		 }
	 }
});

bot.login(auth.token);
