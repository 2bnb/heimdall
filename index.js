const {Client, RichEmbed} = require('discord.js');
const {exec} = require('child_process');
const http = require('http');
const config = require('./config.json');
const db = require('./data.json');

let devPrefix = '';
if (config.dev) {
	db.commandPrefix += 'dev_';
} else {
	devPrefix = `${db.commandPrefix}dev_`;
}

// Initialize Discord Bot
const bot = new Client();

//////////////////////////////////
// Console Log wrapper function //
//////////////////////////////////
function log(type, message) {
	if (!type) { type = 'log'; }

	// Colour codes: https://stackoverflow.com/a/41407246/3774356
	let typeColours = {
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

	let date = new Date(Date.now());
	let timestamp = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;

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
		log('error', `You haven\'t set up channels yet!\nMessage could not be sent: ${message}`);
		return {
			'error': 1,
			'content': `You haven\'t set up channels yet!\nMessage could not be sent: ${message}`
		};
	}

	if (!db.channelIds[channel]) {
		log('error', `Channel ID of ${channel} does not exist.\nMessage could not be sent: ${message}`);
		return {
			'error': 1,
			'content': `Channel ID of ${channel} does not exist.\nMessage could not be sent: ${message}`
		};
	}

	let channelId = db.channelIds[channel];

	// if (guild.available) {}
	bot.channels.get(channelId).send(message);
	return {
		'error': 0,
		'content': 'Notification sent! Have a nice day.'
	};
}

// Listen for commands from the local computer
const server = new http.createServer((request, response) => {
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
			let notifyStatus = notify('Communist machine says: ' + body.content, body.channel);
			log('info', `Received data: ${JSON.stringify(body)}`);

			response.writeHead(100, {'Content-Type': 'application/json'});
			response.write(notifyStatus);
			response.end();
		});
	}
});

server.listen(db.notifications.port, () => {
	log('info', `Listening to port ${db.notifications.port}`);
});

function helpFormat(command) {
	let helpArray = db.helpArray;

	let result = '';
	if (config.dev) {
		result += '__***WARNING: Development mode enabled***__\n\n';
	}

	if (command) {
		if (Object.keys(helpArray).indexOf(command) > -1) {
			result = `**${db.commandPrefix}${command}**: ${helpArray[command]}`;
		} else {
			result = 'That command was not found';
		}
	} else {
		for (let [key, value] of Object.entries(helpArray)) {
			result += `**${db.commandPrefix}${key}**: ${value}\n`;
		}
	}

	return result;
}

function action(message, order, service) {
	let actions = config.actions;
	let action = order + '_' + service;

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
	let flags = string.split(' ', limit);
	flags.shift();
	return flags;
}

bot.on('message', message => {
	// Our bot needs to know if it will execute a command
	// It will listen for messages that will start with `!`, or any commandPrefix specified
	if (message.content.substring(0, db.commandPrefix.length) == db.commandPrefix) {
		if (message.content.substring(0, devPrefix.length) == devPrefix && !config.dev) {
			log('warn', `Attempted to use a dev command whilst not in dev mode: ${message.content}`);
			return;
		}

		let args = message.content.substring(db.commandPrefix.length).split(' ');
		let cmd = args[0];
		let result = [];
		let service;
		log('info', `Command \`${db.commandPrefix}${cmd}\` was called: "${message.content}"`);

		args = args.splice(1);
		switch(cmd) {
			// Command: `!help`
			// Description: Display available commands, or the help for a single command
			// 		if specified
			// Use: `!help [command]`
			// Author: Arend
			case 'help':
				let helpMessage = new RichEmbed()
					.setTitle('Heimdall\'s help')
					.setColor(0xFF0000)
					.setDescription(helpFormat(args[0]));
				message.channel.send(helpMessage);
				result = ['info', 'Help given...'];
				break;

			// Command: `!ping`
			// Description: Send "Pong!"
			// Use: `!ping`
			// Author: Arend
			case 'ping':
				let pong = db.pongs[Math.floor(Math.random() * (db.pongs.length - 0)) + 0];
				message.channel.send(pong);
				result = ['info', `"${pong}" was sent...`];
				break;

			// Command: `!say`
			// Description: Display the given message
			// Use: `!say [message]`
			// Author: Arend
			case 'say':
				let toSay = message.content.substring(db.commandPrefix.length + 4);

				if (toSay) {
					message.channel.send(toSay);
					result = ['info', 'Message regurgitated...'];
				} else {
					message.channel.send('You didn\'t give me anything to say...');
					result = ['warn', 'Nohing given to regurgitate...'];
				}
				break;

			// Command: `!embed`
			// Description: Display the given content as an embedded message
			// Use: `!embed [title]-[description]`
			// Author: Arend
			case 'embed':
				let embed = new RichEmbed()
					.setTitle(message.content.substring(db.commandPrefix.length + 6, message.content.indexOf('-')))
					.setColor(0xFF0000)
					.setDescription(message.content.substring(message.content.indexOf('-') + 1));
				message.channel.send(embed);
				result = ['info', 'Embedded message sent...'];
				break;

			// Command: `!start`
			// Description: Start the given service
			// Use: `!start [service]`
			// Author: Arend
			case 'start':
				service = getFlags(message.content)[0];
				message.channel.send(action(message, 'start', service));
				result = ['info', `Action start_${service} executed...`];
				break;

			// Command: `!stop`
			// Description: stop the given service
			// Use: `!stop [service]`
			// Author: Arend
			case 'stop':
				service = getFlags(message.content)[0];
				message.channel.send(action(message, 'stop', service));
				result = ['info', `Action stop_${service} executed...`];
				break;

			default:
				message.channel.send('Speak up you laggard!');
				result = ['info', `Command \`!${cmd}\` not understood...`];
		 }

		 log(result[0], `Command result: ${result[1]}`);
	 }
});

bot.login(config.auth.token);
