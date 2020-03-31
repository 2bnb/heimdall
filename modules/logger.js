/**
 * Log all them messages!
 * This module will split output between the log file, the stdout and return a
 * readable message to be sent to Discord.
 *
 * Logs will be split into different files for each week. Files older than 2
 * weeks will be deleted automatically.
 *
 * Features:
 * - log - Log a message with any relevant data and a traceback if it's an error
 * - cleanup - Deletes logs older than the last 2 weeks
 * - export - post a downloadable file to Discord containing all logs in a file
 *
 * @author Arend
 */
// Methods to add:
// log
// cleanup
// export
// sendMessage
const fs = require('fs');
const {Client, RichEmbed} = require('discord.js');

// Constructor
const Logger = function(logFilePath) {
	// cleanup
	this.discord = new Client();
	this.logFilePath = logFilePath;
	this.cleanup(logFilePath);
}

Logger.prototype.log = function(message, style = 'info', level = 0) {
	if (message === '') {
		return this.log('Attempted to log with an empty message');
	}

	switch (level) {
		case 2:
			// Log to logfile, stdout and Discord
		case 1:
			// Log to logfule and stdout
			console.log(``)
		case 0:
			// Log to logfile only
			fs.appendFile(
				this.logFilePath,
				message,
				'utf8',
				(err) => {
					console.log(`Not able to log: ${err}`);
				});
			break;
		default:
			break;
	}
}

Logger.prototype.cleanup = function() {
}

Logger.prototype.export = function() {
};

Logger.prototype.sendMessage = function(message) {
};
