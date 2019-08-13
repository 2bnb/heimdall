const config = require('../config.json');
const ArmaServer = require('arma-server').Server;

const ArmaManager = function(server = 'armaOps') {
	this.server = server;
	this.serverOptions = config.servers[server].options;
};

ArmaManager.prototype.instances = [];

ArmaManager.prototype.start = function() {
	let server = new ArmaServer(this.serverOptions);

	server.writeServerConfig();
	let instance = server.start();
	this.instances.push(instance);

	instance.stdout.on('data', function (data) {
		log('info', data);
	});

	instance.stderr.on('data', function (data) {
		log('info', data);
	});

	instance.on('close', function (code) {
		log('warn', 'Close was called: ' + code);
	});

	instance.on('error', function (err) {
		log('error', err);
	});

	return instance;
};

ArmaManager.prototype.stop = function(instance) {
	message.channel.send(`Stopping server: ${server}`);
	return instances[server].kill('SIGINT');
};

ArmaManager.prototype.isActive = function() {
	return true;
};

module.exports = ArmaManager;
