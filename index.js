const {Client, RichEmbed} = require('discord.js');
const {exec} = require('child_process');
const config = require('./config.json');
const data = require('./data.json');

// Initialize Discord Bot
var bot = new Client();

//////////////////////////////////
// Console Log wrapper function //
//////////////////////////////////
function log(type, message) {
	if (!type) { type = 'log'; }

	// Colour codes: https://stackoverflow.com/a/41407246/3774356
	var typeColours = {
		log: {
			prepend: '',
			append: '\x1b[0m'
		},
		error: {
			// Red Foreground then reset
			prepend: '\x1b[31mError: ',
			append: '\x1b[0m'
		},
		warn: {
			// Yellow Foreground then reset
			prepend: '\x1b[33mWarning: ',
			append: '\x1b[0m'
		},
		info: {
			// Blue Foreground "Info: " then reset before message
			prepend: '\x1b[34mInfo: \x1b[0m',
			append: '\x1b[0m'
		}
	};

	var date = new Date(Date.now());
	var timestamp = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;

	console[type](`[\x1b[36m${timestamp}\x1b[0m] ${typeColours[type].prepend}${message}${typeColours[type].append}`);
}


bot.on('ready', function (evt) {
	log('info', 'Bot ready...');
});

function helpFormat(command) {
	var helpArray = data.helpArray;

	var result = '';
	if (command == '') {
		for (let [key, value] of Object.entries(helpArray)) {
			result += '**!' + key + '**: ' + value + '\n';
		}
	} else {
		if (Object.keys(helpArray).indexOf(command) > -1) {
			result = '**!' + command + '**: ' + helpArray[command];
		} else {
			result = 'That command was not found';
		}
	}

	return result;
}

function action(message, order, service) {
	var actions = config.actions;
	var action = order + '_' + service;

	if (Object.keys(actions).indexOf(action) > -1) {
		exec(actions[action], (error, stdout, stderror) => {
			if (error) {
				log('error', `[${action}]: ${error}`);
				message.channel.send(`Error from server:\n\`\`\`\n ${error}\n\`\`\``);
				return;
			}

			log('log', `stdout: ${stdout}`);
			log('log', `stderror: ${stderror}`);
		});

		result = 'Action has been executed.';
	} else {
		result = 'Action does not exist';
	}

	return result;
}

function getFlags(string, limit) {
	if (limit == undefined) { limit = 2 };
	var flags = string.split(' ', limit);
	flags.shift();
	return flags;
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
						helpFormat(message.content.substring(6))
					);
				message.channel.send(embed);
				break;

			// Command: `!ping`
			// Description: Send "Pong!"
			// Use: `!ping`
			// Author: Arend
			case 'ping':
				message.channel.send(data.pongs[Math.floor(Math.random() * (data.pongs.length - 0)) + 0]);
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
			// Use: `!embed [title]-[description]`
			// Author: Arend
			case 'embed':
				var embed = new RichEmbed()
					.setTitle(message.content.substring(6, message.content.indexOf('-')))
					.setColor(0xFF0000)
					.setDescription(message.content.substring(message.content.indexOf('-') + 1));
				message.channel.send(embed);
				break;

			// Command: `!start`
			// Description: Start the given service
			// Use: `!start [service]`
			// Author: Arend
			case 'start':
				var service = getFlags(message.content)[0];
				message.channel.send(action(message, 'start', service));
				break;

			// Command: `!stop`
			// Description: stop the given service
			// Use: `!stop [service]`
			// Author: Arend
			case 'stop':
				var service = getFlags(message.content)[0];
				action(message, 'stop', service);
				break;

			default:
				message.channel.send('Speak up you laggard!');
		 }
	 }
});

bot.login(config.auth.token);
