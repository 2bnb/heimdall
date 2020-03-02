/**
 * Arma specific server driver which handles server and headless client
 * instances.
 *
 * Features:
 * - this.start - Start an instance
 * - this.stop - Stop an instance
 * - this.isAlive - Check an instance is still running
 * - this.cleanPointers - Clean up the `this.instances` array of dead instances
 *
 * @author Arend
 */
const fs = require('fs');
const logPath = 'logs/arma.log';

const out = fs.openSync(logPath, 'a');
const err = fs.openSync(logPath, 'a');

const config = require('../config.json');
const ArmaServer = require('arma-server').Server;
const ArmaHeadless = require ('arma-server').Headless;

const ArmaManager = function() {
};

ArmaManager.prototype.instances = [];

ArmaManager.prototype.start = function(serverName) {
	if (typeof serverName !== 'string') {
		console.log('No server given when instantiating ArmaManager! Server name: ', serverName);
		return false;
	}

	let serverConfig = config.servers[serverName];
	let serverOptions = {
		...config.defaultServerSettings.arma.options,
		...serverConfig.options,
	};

	// Start the actual server
	let server = null;
	if (serverConfig.type == 'headless') {
		server = new ArmaHeadless(serverOptions);
	} else {
		serverConfig.type = 'server';
		server = new ArmaServer(serverOptions);
		server.writeServerConfig();
	}
	console.log('Type: ', serverConfig.type, 'Server instance: ', server);

	instance = {
		name: serverName,
		type: serverConfig.type,
		options: serverOptions,
		process: server.start()
	};

	// Save the server details for later use
	this.instances.push(instance);

	// instance.stdout.on('data', function (data) {
	// 	console.log(data);
	// });

	// instance.stderr.on('data', function (data) {
	// 	console.log(data);
	// });

	let parent = this;
	instance.process.on('close', function (code) {
		console.log(`The ${instance.name} ${instance.type} with PID ${this.pid} was closed: ${code}`);
		parent.cleanPointers();
	});

	instance.process.on('error', function (err) {
		console.log(`${instance.name} ${instance.type} with PID ${this.pid} errored: ${err}`);
		parent.cleanPointers();
	});

	return instance;
};

ArmaManager.prototype.stop = function(serverName) {
	console.log('Killing processes');
	if (serverName == 'all') {
		this.instances.forEach(instance => {
			console.log(process.kill(-instance.process.pid));
		});
	} else {
		this.instances.forEach(instance => {
			if (instance.name === serverName) {
				console.log(process.kill(-instance.process.pid));
			}
		});
	}

	this.cleanPointers();
};

ArmaManager.prototype.isAlive = function(pid) {
	if (typeof pid === 'object') {
		console.log('Tried to use object to check if server is alive: ', pid);
		pid = (this.instances.find(instance => instance.process == pid)).process.pid;
	}

	try {
		process.kill(pid, 0);
	} catch (e) {
		console.log('PID found to be dead: ', pid);
		return false;
	}
	console.log('PID found to be alive: ', pid);
	return true;
};

ArmaManager.prototype.cleanPointers = function() {
	console.log('Instances to clean up: ', this.instances);
	let pointersRemoved = 0;

	this.instances.forEach(
		(instance, index, instances) => {
			if (!this.isAlive(instance.process.pid)) {
				instances.splice(index, 1);
				pointersRemoved += 1;
			}
		}
	);
	console.log('Instances cleaned up: ', this.instances);

	return pointersRemoved;
}

module.exports = ArmaManager;
