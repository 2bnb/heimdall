/**
 * Arma specific server driver which handles server and headless client
 * instances.
 *
 * Features:
 * - this.start - Start an instance
 * - this.stop - Stop an instance
 * - this.isAlive - Check an instance is still running
 * - this.updatePointers - Update `this.instances` with instances that are
 *                         actually running on the server
 *
 * @author Arend
 */
const fs = require('fs');
const logPath = 'logs/arma.log';
const psList = require('ps-list');

const out = fs.openSync(logPath, 'a');
const err = fs.openSync(logPath, 'a');

const config = require('../config.json');
const ArmaServer = require('arma-server').Server;
const ArmaHeadless = require ('arma-server').Headless;

const ArmaManager = function() {
};

ArmaManager.prototype.instances = [];

/**
 * Start an instance of the server, using the appropriate settings
 *
 * @param  {String} serverName The name of the options in config.json
 * @return {Object}            The object containing instance data in the format
 *                             {name,type,options,process}
 */
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
		nicename: serverConfig.nicename,
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
		parent.updatePointers();
	});

	instance.process.on('error', function (err) {
		console.log(`${instance.name} ${instance.type} with PID ${this.pid} errored: ${err}`);
		parent.updatePointers();
	});

	return instance;
};

/**
 * Stop all instances related to the serverName
 *
 * @param  {String} serverName The name of the server collection
 *                             Additional names possible:
 *                             "all" - all instances that are still running
 *                             "unknown" - any instances found that were not
 *                                         started by this module
 * @return {Number}            The number of instances stopped
 */
ArmaManager.prototype.stop = function(serverName) {
	console.log(`Killing all instances of "${serverName}"`);
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

	return this.cleanPointers();
};

/**
 * Checks if a particular instance is still running on the server, or the first
 * found instance if the `childProcess` argument is a string
 *
 * @param  {Number|Object|String}  childProcess  The process we're checking for
 *                                               life
 * @return {Boolean}             State of the found instance
 */
ArmaManager.prototype.isAlive = function(childProcess) {
	let pid = childProcess;

	if (typeof childProcess === 'object') {
		console.log('Tried to use object to check if server is alive: ', childProcess);
		pid = (this.instances.find(instance => instance.process == childProcess)).process.pid;
	}

	if (typeof childProcess === 'string') {
		console.log('Tried to use string to check if server is alive: ', childProcess);
		pid = (this.instances.find(instance => instance.name == childProcess)).process.pid;
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

/**
 * Update `this.instances` so that it is the same as the actual running programs
 */
ArmaManager.prototype.updatePointers = function() {
	let newPointers = [];

	this.cleanPointers();

	(async () => {
		list = await psList();
		processes = list.filter(instance => instance.name == 'arma3server_x64.exe');

		let newInstances = [];
		processes.forEach(process => {
			let instance = {
				name: 'unknown',
				nicename: 'Arma server',
				type: 'server',
				process: process
			};
			if (!this.instances.find(item => item.process.pid == process.pid)) {
				this.instances.push(instance);

				newInstances.push(instance);
			}
		});

		if (newInstances.length > 0) {
			console.log('Updated instances with unknown ones: ', newInstances);
		}
	})(this.instances);
}

/**
 * Cleans up `this.instances`, removing any instances that aren't running anymore
 *
 * @return {Number} The amount of instances that were removed from the array
 */
ArmaManager.prototype.cleanPointers = function() {
	let pointersRemoved = 0;

	this.instances.forEach(
		(instance, index, instances) => {
			if (!this.isAlive(instance.process.pid)) {
				instances.splice(index, 1);
				pointersRemoved += 1;
			}
		}
	);

	return pointersRemoved;
}

module.exports = ArmaManager;
