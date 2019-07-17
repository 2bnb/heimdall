const {Client, RichEmbed} = require('discord.js');
const {exec} = require('child_process');
const http = require('http');
const config = require('./config.json');
const db = require('./data.json');

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

////////////////////////////////////
// Discord notifications to Users //
////////////////////////////////////
function notify(message, channel = 'log') {
	if (!db.channelIds) {
		log('error', `Channel ID of ${channel} does not exist.\nMessage could not be sent: ${message}`);
	}

	var channelId = db.channelIds[channel];

	// if (guild.available) {}
	bot.channels.get(channelId).send(message);
}

// Listen for commands from the local computer
server = new http.createServer((request, response) => {
	let connection = request.socket;
	log('info', `Client ${connection.remoteAddress}:${connection.remotePort} connected`);

	connection.on('close', () => {
		log('info', `Client disconnected normally`);
	});

	request.on('error', (err) => {
		if (err) {
			switch (err.code) {
				case 'ECONNRESET':
					log('error', 'Connection closed prematurely by the client, we may have lost some data');
					break;

				case 'EADDRINUSE':
					log('error', 'Port in use, retrying...');

					setTimeout(() => {
						server.close();
						server.listen(db.notifications.port, () => {
							log('info', `Listening to port ${db.notifications.port}`);
						});
					}, 1000);
					break;

				default:
					log('error', `Listening errored unexpectedly: ${err.message}`);
					break;
			}

			response.writeHead(100, {'Content-Type': 'application/json'});
			response.write('{"error": 1, "content": "An error occured, check Heimdall\'s log for more details."}');
			response.end();
		}
	});

	// Handle the request
	if (request.method === 'POST') {
		let body = '';

		request.on('data', (data) => {
			body += data.toString();
		});

		request.on('end', () => {
			body = JSON.parse(body);
			notify('Communist machine says: ' + body.content);
			log('info', `Client sent data: ${JSON.stringify(body)}`);

			response.writeHead(100, {'Content-Type': 'application/json'});
			response.write('{"error": 0, "content": "Notification sent! Have a nice day."}');
			response.end();
		});
	}
});

server.listen(db.notifications.port, () => {
	log('info', `Listening to port ${db.notifications.port}`);
});

function helpFormat(command) {
	var helpArray = db.helpArray;

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

			if (stderror) {
				log('warn', `stderror: ${stderror}`);
			}
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
		var result = '';

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
				result = 'Help given...';
				break;

			// Command: `!ping`
			// Description: Send "Pong!"
			// Use: `!ping`
			// Author: Arend
			case 'ping':
				var pong = db.pongs[Math.floor(Math.random() * (db.pongs.length - 0)) + 0];
				message.channel.send(pong);
				result = `"${pong}" was sent...`;
				break;

			// Command: `!say`
			// Description: Display the given message
			// Use: `!say [message]`
			// Author: Arend
			case 'say':
				message.channel.send(message.content.substring(4));
				result = 'Message regurgitated...';
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
				result = 'Embedded message sent...';
				break;

			// Command: `!start`
			// Description: Start the given service
			// Use: `!start [service]`
			// Author: Arend
			case 'start':
				var service = getFlags(message.content)[0];
				message.channel.send(action(message, 'start', service));
				result = `Action start_${service} executed...`
				break;

			// Command: `!stop`
			// Description: stop the given service
			// Use: `!stop [service]`
			// Author: Arend
			case 'stop':
				var service = getFlags(message.content)[0];
				message.channel.send(action(message, 'stop', service));
				result = `Action stop_${service} executed...`
				break;

			default:
				message.channel.send('Speak up you laggard!');
				result = `Command \`!${cmd}\` not understood...`;
		 }

		 log('info', `Command \`!${cmd}\` was called: "${message.content}"`);
		 log('info', `Command result: ${result}`);
	 }
});

bot.login(config.auth.token);
