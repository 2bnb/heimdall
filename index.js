const {Client, MessageEmbed} = require('discord.js');
const {exec, spawn} = require('child_process');
const http = require('http');
const parseArgs = require('string-argv').parseArgsStringToArgv;

const config = require('./config.json');
const db = require('./data.json');
const serverManagerClasses = require('./modules/index.js');
let serverManagers = {};


// Register each of the server modules into the object for automated referencing
for (var i = 0; i < Object.values(serverManagerClasses).length; i++) {
	let instance = new serverManagerClasses[Object.values(serverManagerClasses)[i].name];
	serverManagers[instance.game] = instance;
}


// Are we in development mode?
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

	// Avoid cluttering production channels with testing messages
	if (config.dev) {
		channelId = db.channelIds['testing'];
	}

	bot.channels.get(channelId).send(message);
	return {
		'error': 0,
		'content': 'Notification sent! Have a nice day.'
	};
}

// Listen for commands from the local computer
const httpServer = new http.createServer((request, response) => {
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
						httpServer.close();
						httpServer.listen(db.notifications.port, () => {
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

httpServer.listen(db.notifications.port, () => {
	log('info', `Listening to port ${db.notifications.port}`);
});

/////////////////////////////
// Format the Help Message //
/////////////////////////////
function helpFormat(command, roles) {
	let helpArray = db.helpArray.public;

	if (roles.has(db.roleIds.member)) {
		Object.assign(helpArray, db.helpArray.member);

		if (roles.has(db.roleIds.nco) || roles.has(db.roleIds.command)) {
			Object.assign(helpArray, db.helpArray.nco);
		}

		if (roles.has(db.roleIds.command)) {
			Object.assign(helpArray, db.helpArray.command);
		}
	}

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


/////////////////////////////
// Execute action commands //
/////////////////////////////
function action(message, actionName) {
	let actions = config.actions;
	let result = '';
	let actionExecutedMessage = 'Action has been executed.';

	if (actionName == 'update_heimdall') {
		result = action(message, 'pull_heimdall') !== actionExecutedMessage
		? message.channel.send('Heimdall failed to update')
		: message.channel.send('Heimdall has been updated');
		return result;
	}

	// If the action exists
	if (Object.keys(actions).indexOf(actionName) > -1) {
		let command = actions[actionName];

		if (typeof command === 'string') {
			exec(command, (error, stdout, stderror) => {
				if (error) {
					log('error', `[${actionName}]: ${error}`);
					message.channel.send(`Error from server:\n\`\`\`\n ${error}\n\`\`\``);
					return;
				}

				log('log', `stdout: ${stdout}`);

				if (stderror) {
					log('warn', `stderror: ${stderror}`);
				}
			});
		} else {
			spawn(command);
		}

		result = actionExecutedMessage;
	} else {
		result = 'Action does not exist.';
	}

	return result;
}

////////////////////////////////////////////
// Return formatted message ready to send //
////////////////////////////////////////////
function embed(title, description = '', color = 0xFF0000) {
	return new MessageEmbed()
		.setTitle(title)
		.setColor(color)
		.setDescription(description);
}

/////////////////////////////////
// Get Arguments into an array //
/////////////////////////////////
function getArgs(string, raw = false) {
	let args = parseArgs(string);
	args[0] = raw ? args[0] : args[0].substring(db.commandPrefix.length);
	return args;
}

bot.on('message', message => {
	// Our bot needs to know if it will execute a command
	// It will listen for messages that will start with `!`, or any commandPrefix specified
	if (
		(message.content.substring(0, db.commandPrefix.length) == db.commandPrefix)
		&& (message.content.substring(db.commandPrefix.length).length > 0)
	) {
		if (message.content.substring(0, devPrefix.length) == devPrefix && !config.dev) {
			return;
		}

		let hasCommandRole = message.member.roles.cache.has(db.roleIds.command);
		let hasNcoRole = message.member.roles.cache.has(db.roleIds.nco);
		let hasServerDevRole = message.member.roles.cache.has(db.roleIds.serverDev)
		let hasMemberRole = message.member.roles.cache.has(db.roleIds.member);
		let args = getArgs(message.content);
		let arguments = { command: args[0] };
		let result = [];
		let formattedMessage;
		log('info', `Command \`${db.commandPrefix}${arguments.command}\` was called: "${message.content}"`);

		////////////
		// Public //
		////////////
		switch(arguments.command) {
			// Command: `!help`
			// Description: Display available commands, or the help for a single command
			// 		if specified
			// Use: `!help [command]`
			// Author: Arend
			case 'help':
				log('info', message.member.roles);
				message.channel.send(embed('Heimdall\'s help', helpFormat(args[1], message.member.roles.cache)));
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
					message.delete();
					result = ['info', `Message by ${message.author.tag} regurgitated...`];
				} else {
					message.channel.send('You didn\'t give me anything to say...');
					result = ['warn', 'Nothing given to regurgitate...'];
				}
				break;

			// Command: `!embed`
			// Description: Display the given content as an embedded message
			// Use: `!embed [title]\n[description]`
			// Author: Arend
			case 'embed':
				if (args[1]) {
					let separator = message.content.indexOf('\n') > -1 ? message.content.indexOf('\n') : message.content.length;
					Object.assign(arguments, {
						title: message.content.substring(
							db.commandPrefix.length + arguments.command.length,
							separator
						),
						description: message.content.substring(separator + 1)
					});

					let randomColour = Math.floor(Math.random()*16777215).toString(16);
					message.channel.send(embed(arguments.title, arguments.description, randomColour));
					message.delete();
					result = ['info', `Embedded message by ${message.author.tag} sent...`];
				} else {
					message.channel.send('You didn\'t give me anything to embed...');
					result = ['warn', 'Nothing given to embed...'];
				}

				break;
		}

		////////////////////////
		// @Member and higher //
		////////////////////////
		if (hasMemberRole) {
			switch(arguments.command) {
				// Command: `!status`
				// Description: Display the status of the Operations server
				// Use: `!status
				// Author: Arend
				case 'status':
					let singularServer = action(message, `status_${args[1]}`);
					singularServer = singularServer !== 'Action does not exist' ? singularServer : '';
					message.channel.send([
						singularServer,
						'2BNB server statuses:'
					], {
						files: config.serverStatusURLs
					});
					result = ['info', 'Status sent...'];
					break;
			}

			/////////////////////
			// @NCO and higher //
			/////////////////////
			if (hasNcoRole || hasCommandRole || hasServerDevRole) {
				switch(arguments.command) {
					// Command: `!run`
					// Description: Run the given action (configured as commandlines in config.json)
					// Use: `!run [action]`
					// Author: Arend
					case 'run':
						Object.assign(arguments, {
							action: args[1]
						});

						message.channel.send(action(message, arguments.action));
						result = ['info', `Action ${action} executed...`];
						break;

					// Command: `!start`
					// Description: Start the given game server
					// Use: `!start [game] [serverProfile]`
					// Args:
					// 		0: command
					// 		1: game - The ID of the game (name, basically)
					// 		2: serverProfile - The name of the server profile saved by FASTER
					// Author: Arend
					case 'start':
						Object.assign(arguments, {
							game: args[1],
							serverProfile: args[2]
						});

						if (!serverManagers.hasOwnProperty(arguments.game)) {
							message.channel.send(`Failed to start any ${arguments.game} instance, since that game isn't configured yet.`);
							result = ['error', `Failed to start any ${arguments.game} instance, there isn't any configured in config.js yet.`];
							break;
						}

						arguments.game = arguments.game.toLowerCase();
						let driver = serverManagers[arguments.game].start(arguments.serverProfile);

						if (!driver.instances || driver.instances.length <= 0) {
							message.channel.send(`Failed to start any ${arguments.game} instances, please contact your lord a saviour for some divine intervention.`);
							result = ['error', `Failed to start any ${arguments.game} instances. Profile: ${arguments.serverProfile}.`];
							break;
						}

						message.channel.send(`Spun up ${driver.instances.length} ${arguments.game} servers. Profile: ${arguments.serverProfile}`);
						message.channel.send(embed('Technical jargon', driver.message, config.serverEnvironments[arguments.game].colour));

						result = [
							'info',
							`Spun up ${driver.instances.length} ${arguments.game} instances from profile ${arguments.serverProfile}:\n${driver.log}`];
						break;

					// Command: `!stop`
					// Description: stop the given games server
					// Use: `!stop [game] [serverProfile]`
					// Args:
					// 		0: command
					// 		1: game - The ID of the game (name, basically)
					// 		2: serverProfile - The name of the server profile saved by FASTER
					// Author: Arend
					case 'stop':
						Object.assign(arguments, {
							game: args[1],
							serverProfile: args[2]
						});

						if (!serverManagers.hasOwnProperty(arguments.game)) {
							message.channel.send(`Failed to stop any ${arguments.game} instance, since that game isn't configured yet.`);
							result = ['error', `Failed to stop any ${arguments.game} instance, there isn't any configured in config.js yet.`];
						}

						arguments.game = arguments.game.toLowerCase();
						let stoppedInstances = serverManagers[arguments.game].stop(arguments.serverProfile);

						message.channel.send(`Shutdown ${stoppedInstances} ${arguments.game} servers. Profile: ${arguments.serverProfile}`);
						result = ['info', `Shutdown ${stoppedInstances} ${arguments.game} instances`];
						break;
				}
			}

			/////////////////////////
			// @Command and higher //
			/////////////////////////
			if (hasCommandRole) {
				switch(arguments.command) {
					// Command: `!update`
					// Description: Update Heimdall to the latest commit on Github
					// Use: `!update
					// Author: Arend
					case 'update':
						message.channel.send(action(message, 'update_heimdall'));
						result = ['info', `Action update_heimdall executed...`];
						break;
				}
			}
		}

		if (result.length == 0) {
			message.channel.send('Speak up you laggard!');
			result = ['info', `Command \`!${arguments.command}\` not understood...`];
		}

		log(result[0], `Command result: ${result[1]}`);
	}
});

bot.login(config.auth.token);
