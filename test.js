var ArmaServer = require('arma-server').Server;

var serverOptions = {
	path: 'D:\\Programs\\Steam\\steamapps\\common\\Arma 3 Server',
	game: 'arma3_x64',
	parameters: [
		'-port=2302',
		'-noPause',
		'-noSound',
		'-world=empty',
		'-exThreads=8',
		'-malloc=system',
		'-enableHT',
		'-maxMem=8192',
		'-ranking=""',
		'-par=""',
		'-profiles="D:\\Programs\\Steam\\steamapps\\common\\Arma 3 Server"'
	],
	config: 'server.cfg',
	serverMods: [
		'@vcom_ai',
		'@dzn Casual Gaming',
		'@2BNB Framework'
	],
	mods: [
		'mods\\@CBA_A3',
		'mods\\@ace',
		'mods\\@ACEX',
		'mods\\@Achilles',
		'mods\\@Task Force Arrowhead Radio (BETA!!!)',
		'mods\\@MLO All-In-One Collection',
		'mods\\@CUP Terrains - Core',
		'mods\\@CUP Terrains - Maps',
		'mods\\@ Achilles',
		'mods\\@ADV - ACE Medical',
		'mods\\@BiBo’s European Insignia Pack',
		'mods\\@Advanced Rappelling',
		'mods\\@ACE 3 Extension (Animations and Actions)',
		'mods\\@ACE 3 Extension (Placeables)',
		'mods\\@Advanced Sling Loading',
		'mods\\@Advanced Towing',
		'mods\\@Advanced Urban Rappelling',
		'mods\\@ALiVE',
		'mods\\@BackpackOnChest',
		'mods\\@Blastcore Edited (standalone version)',
		'mods\\@CH View Distance',
		'mods\\@Enhanced Movement',
		'mods\\@Enhanced Soundscape',
		'mods\\@Enhanced Visuals',
		'mods\\@GRAD Trenches',
		'mods\\@ILBE Assault Pack (TFAR)',
		'mods\\@L3-GPNVG18 Panoramic Night Vision',
		'mods\\@RHSAFRF',
		'mods\\@RHSGREF',
		'mods\\@RHSUSAF',
		'mods\\@ACE Compat - RHS Armed Forces of the Russian Federation',
		'mods\\@ACE Compat - RHS United States Armed Forces',
		'mods\\@ACE Compat - RHS- GREF',
		'mods\\@RHSSAF',
		'mods\\@Splendid Smoke',
		'mods\\@Radio Animations for Task Force Radio',
		'mods\\@Drongo\'s Active Protection System',
		'mods\\@GRAD SlingHelmet',
		'mods\\@Jbad',
		'mods\\@LYTHIUM',
		'mods\\@Specialist Military Arms (SMA) Version 2.7.1',
		'mods\\@Project OPFOR',
		'mods\\@3CB BAF Equipment',
		'mods\\@3CB BAF Units',
		'mods\\@3CB BAF Units (ACE compatibility)',
		'mods\\@3CB BAF Units (RHS compatibility)',
		'mods\\@3CB BAF Vehicles (RHS reskins)',
		'mods\\@3CB BAF Vehicles (RHS ammo compatibility)',
		'mods\\@3CB BAF Vehicles',
		'mods\\@3CB BAF Vehicles (Servicing extension)',
		'mods\\@3CB BAF Weapons',
		'mods\\@RKSL Studios- Attachments v3.00',
		'mods\\@3CB Factions',
		'mods\\@Align',
		'mods\\@Breaching Charge',
		'mods\\@Complementary Police Weapons',
		'mods\\@KLPQ Music Radio',
		'mods\\@Suppress',
		'mods\\@Sweet markers system',
		'mods\\@Immerse',
		'mods\\@Rosche, Germany',
		'mods\\@MBG Buildings 3 (Arma2 Legacy)',
		'mods\\@DUI - Squad Radar',
		'mods\\@NORSOF_LITE_mas',
		'mods\\@The Mighty GAU-8 Avenger',
		'@2BNB Extras'
	]
};

var server = new ArmaServer(serverOptions);

server.writeServerConfig();
var instance = server.start();

instance.stdout.on('data', function (data) {
	console.log(data);
});

instance.stderr.on('data', function (data) {
	console.log(data);
});

instance.on('close', function (code) {
	console.warn('Close was called: ' + code);
});

instance.on('error', function (err) {
	console.error(err);
});

setTimeout(function() {
	instance.kill('SIGINT');
}.bind(instance), 10000);
