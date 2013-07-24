var	findit  = require('findit');
var request = require("request");
var express = require('express');
var app     = express();
var server  = require("http").createServer(app);
var fs      = require("fs");
var ftp     = require('jsftp');
var jsdom   = require("jsdom");
var crypto  = require("crypto");
	
// get port number from command line option
var port = process.argv[2] || 8001;

function isNumeric(num){return !isNaN(num)}

// Command line mode.
if (!isNumeric(port)) {
	dir = port;
	lsremote(dir, function (files) {console.log(files);});
	return;
}
		
function lsremote(dir, recursive, job, callback) {
	if (dir.match(/^file|^\//)) {
		getlistlocal(dir, recursive, callback);
	} else if (dir.match(/^ftp[s]?/)) {
		getlistftp(dir, recursive, callback);
	} else if (dir.match(/^http[s]?/)) {
		getlisthttp(dir, recursive, job, callback);
	} else {
		getlistother(dir, recursive, callback);		
	}	
}

function getlistother(dir, recurursive, callback) {
	callback("Protocol " + dir.replace(/(.*)\:.*/,'$1') + " not supported.");
}

function getlistftp(dir, recursive, callback) {

	var host = dir.replace(/^ftp[s]?\:\/\//,'');
	var path = host.replace(/(.*)\/(.*)/,'/$2');
	var host = host.replace(/(.*)\/(.*)/,'$1');
	
	port = 21;
	if (host.match(/\:/)) {
		var port = host.replace(/(.*)\:(.*)/,'$2');
		var host = host.replace(/(.*)\:(.*)/,'$1');
	}
	console.log("Attempting anonymous ftp directory listing at " + host + " on port " + port + " in path " + path);

	var ftpconn = new ftp({
							host: host,
							user: "anonymous",
							port: port,
							pass: ""
						});

	ftpconn.ls(path,
					function(err, tmp) {
						if (err) return console.error(err);
						callback(tmp);
				});
}

function getlisthttp(dir, recursive, job, callback) {

	if (typeof(getlisthttp.work) === "undefined") {
		getlisthttp.work = [];
	}	
	
	// Increment counter for each call.
	if (typeof(getlisthttp.work[job]) === "undefined") {		
		getlisthttp.work[job]       = {};
		getlisthttp.work[job].Nr    = 1;   // Number of dirs left to process.
		getlisthttp.work[job].files = [];  // Array of file names.
		getlisthttp.work[job].dirs  = [];							
		getlisthttp.work[job].f     = 0; // Number of files found.		
	} else {
		getlisthttp.work[job].Nr = getlisthttp.work[job].Nr+1;
	}
	request({uri: dir}, function(err, response, body) {
		var self   = this;
		self.items = new Array();
		if (err && response.statusCode !== 200) {console.log('Request error.');}

		// Send the body param as the HTML code we will parse in jsdom
		// also tell jsdom to attach jQuery in the scripts and loaded from jQuery.com
		jsdom.env({
					html: body,
					scripts: ['http://code.jquery.com/jquery.min.js'],
					done: function (err, window) {
					
						// Use jQuery just as in a regular HTML page
						var $ = window.jQuery;

						var dirs = [];
						var d = 0;
						//console.log($('a'));
						$('a').each(function () {
							var href = $(this).attr('href');
							var text = $(this).text();
							//console.log(text);
 							// Skip parent directory link and files that start with "?".
							if (!href.match(/^\?/) && !text.match("Parent Directory")) {
								if (href.match(/\/$/)) {
									dirs[d] = dir + href;
									console.log("Directory: " + dirs[d]);
									if (recursive)
										getlisthttp(dirs[d], recursive, job, callback);
									d = d+1;
								} else {
									//files[f] = new Array();
									//files[f][0] = tmp;
									getlisthttp.work[job].files[getlisthttp.work[job].f] = dir + href;
									console.log("File: " + getlisthttp.work[job].files[getlisthttp.work[job].f]);
									//files[f][1] = $($(this).parent().nextAll('td')[0]).text()
									//files[f][2] = $($(this).parent().nextAll('td')[1]).text()
									getlisthttp.work[job].f = getlisthttp.work[job].f+1;							
								}
							}							
						});	

						getlisthttp.work[job].Nr = getlisthttp.work[job].Nr-1					
						if (d == 0 && getlisthttp.work[job].Nr == 0) {
							// No directories at this level and no pending requests.
							callback(getlisthttp.work[job].files);
						}	
					}					
				});				
	});
	
}

function getlistlocal(dir, recursive, callback) {

	var diro = dir;
	dir = dir.replace(/file\:/,'');
	dir = dir.replace(/^\/\//,'/');
	
	if (recursive) {
		var files = require('findit').sync(dir);
		for (i = 0;i<files.length;i++) {files[i] = "file://" + files[i];}
	} else {
		var files = fs.readdirSync(dir);
		for (i = 0;i<files.length;i++) {files[i] = diro + files[i];}
	}
	callback(files);
}

app.use(express.bodyParser());
app.use("/deps", express.static(__dirname + "/deps"));
app.use(function (req, res, next) {res.contentType("text");next();});

var job = 0;
var cache = {};
app.get('/lsremote.js', function(req, res){
	res.contentType("html");
	
	function s2b(str) {if (str === "true") {return true} else {return false}}
	function s2i(str) {return parseInt(str)}
	
	var pattern   = req.query.pattern 		|| "";
	var modifiers = req.query.modifiers 		|| "";	
	var dir       = req.query.dir 			|| "";
	var recursive = s2b(req.query.recursive) || false;
	var forceUpdate = s2b(req.query.forceUpdate) || false;
	
	var reqmd5 = crypto.createHash("md5").update(dir+pattern+modifiers+recursive).digest("hex");
	
	if (!forceUpdate && cache[reqmd5]) {
		res.send(cache[reqmd5]);
		// Only cache 100 responses.
		// TODO: Remove oldest first.  Constrain cache based on memory, not length.
		if (Object.keys(cache).length > 100) {
			console.log("Trimming cache");
			delete cache[Object.keys(cache)[0]];
		}
		return;
	}
	if (dir === "") {
		res.send("A directory must be specified");
	}
	if (dir.match(/^file|^\//)) {
		if (!(req.connection.remoteAddress === req.connection.address().address)) {
			var msg = "Listing of server filesystem directory is only allowed if client IP (" + req.connection.remoteAddress + ") = server IP ("+req.connection.address().address+")";
			console.log(msg);
			res.send(403, msg);
			return;
		}	
	}
	//console.log(pattern);
	//console.log(modifiers);
	lsremote(dir, recursive, job, function (files) {
		if (pattern !== "") { 
			var patt = new RegExp(pattern, modifiers);
			console.log(pattern);
			console.log(dir);
			//console.log(files);
			//console.log(files.filter(function (val) {return val.match(patt,modifiers)}));
			cache[reqmd5] = files.filter(function (val) {return val.match(patt, modifiers)});
			res.send(cache[reqmd5]);
			delete getlisthttp.work[job];
			job = job+1;
		} else {	
			//console.log(files);
			res.send(files);
		}
		
	});	
});

server.listen(port);