/**
 * Arma specific server driver which handles command lines that are exported
 * from the FASTER server management software.
 * FASTER: https://github.com/Foxlider/FASTER
 *
 * Public Features:
 * - this.start - Start an instance
 * - this.stop - Stop an instance
 * - this.status - Return running instances and their data
 * - this.updatePointers - Update `this.instances` with instances that are
 *                         actually running on the server, removing dead ones
 *
 * @author Arend
 */
const fs = require('fs');
const path = require('path');
const {spawn} = require('child_process');
// const logPath = '../logs/arma.log';
const psList = require('ps-list');
const parseArgs = require('string-argv').parseArgsStringToArgv;

// const out = fs.openSync(logPath, 'a');
// const err = fs.openSync(logPath, 'a');

const config = require('../config.json');

const ArmaManager = function() {};

/**
 * The game that this server belongs to.
 *
 * @type {String}
 */
ArmaManager.prototype.game = 'arma';

/**
 * Array of known instances.
 *
 * @type {Array}
 */
ArmaManager.prototype.instances = [];

/**
 * Start an instance of the server, using the appropriate settings
 *
 * @param  {String} serverProfile The name of the server profile saved by FASTER
 * @return {Object}               The object containing instance data in the format
 *                                {name,nicename,type,options,process}
 */
ArmaManager.prototype.start = function(serverProfile) {
	this.updatePointers();

	if (typeof serverProfile !== 'string') {
		console.log('No server given when instantiating ArmaManager! Server name: ', serverProfile);
		// TODO: Execute all
		return false;
	}

	let serverCommandlines = this.getCommandlines(serverProfile); // Returns an array of command lines as strings to execute
	let instances = [];

	serverCommandlines.forEach(commandline => {
		instances.push(this.executeServer(serverProfile, commandline));
	});

	return instances;
};

/**
 * Stop all instances related to the serverProfile
 *
 * @param  {String} serverProfile The name of the server profile
 *                                Additional names possible:
 *                                "all" - all instances that are still running
 *                                "unknown" - any instances found that were not
 *                                         started by this module
 * @return {Number}               The number of instances stopped
 */
ArmaManager.prototype.stop = function(serverProfile = 'all') {
	this.updatePointers();

	console.log(`Killing all instances of "${serverProfile}"`);
	if (serverProfile == 'all') {
		this.instances.forEach(instance => {
			console.log(serverProfile, this.instances);
			console.log(process.kill(-instance.process.pid));
		});
	} else {
		this.instances.forEach(instance => {
			if (instance.name === serverProfile) {
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
				profile: 'unknown',
				headless: false,
				options: [],
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
};

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
};

/**
 * Converts commandlines for the appropriate `serverProfile` to an array of
 * arguments.
 *
 * @param  {String} serverProfile The name of the server profile saved by FASTER
 * @return {Array}                The commandlines to be executed
 */
ArmaManager.prototype.getCommandlines = function(serverProfile) {
	let commandlines = (fs.readFileSync('configs/arma3.config', 'utf8')).split('\n');

	return commandlines = commandlines.filter((commandline) => {
		let profileName = path.basename(
			commandline
				.substring(
					commandline.indexOf('-profiles=') + 10,
					commandline.indexOf(' -', commandline.indexOf('-profiles=')))
				.replace('_',' ')
				.replace('"', '')
		);

		// TODO: allow aliases
		return profileName == serverProfile;
	});
};

/**
 * Executes the executable file with the parsed commandlines per requested
 * server.
 *
 * @param  {String} serverProfile The name of the server profile saved by FASTER
 * @param  {String} commandline   Commandline arguments per server that need
 *                                to be launched
 * @return {Object}               Server instance data including the resultant
 *                                process
 */
ArmaManager.prototype.executeServer = function(serverProfile, commandline) {
	let serverArgs = parseArgs(commandline);
	console.log(commandline, serverArgs);

	// Start the actual server
	let server = spawn(
		path.join(config.serverEnvironments.arma.path, config.serverEnvironments.arma.executable),
		serverArgs,
		{
			env: process.env,
			detached: true,
			stdio: 'ignore'
		}
	);
	console.log('Is headless: ', serverArgs.includes("-client"), 'Server instance: ', server);

	let instance = {
		profile: serverProfile,
		headless: serverArgs.includes('-client'),
		options: serverArgs,
		process: server
	};

	// Save the server details for later use
	this.instances.push(instance);

	let parent = this;
	instance.process.on('close', function (code) {
		console.log(`The ${instance.name} ${instance.headless} with PID ${this.pid} was closed: ${code}`);
		parent.updatePointers();
	});

	instance.process.on('error', function (err) {
		console.log(`${instance.name} ${instance.headless} with PID ${this.pid} errored: ${err}`);
		parent.updatePointers();
	});

	return instance;
};

module.exports = ArmaManager;
