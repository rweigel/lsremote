var	findit  = require('findit');
var request = require("request");
var express = require('express');
var app     = express();
var server  = require("http").createServer(app);
var fs      = require("fs");
var ftp     = require('jsftp');
var crypto  = require("crypto");
var cheerio = require('cheerio');
var http    = require("http");
var https   = require("https");
var url     = require('url');

var maxCache = 1000; // Max number of responses to cache.

// get port number from command line option
var port = process.argv[2] || 8001;
var debug = process.argv[3] || false;

function isNumeric(num){return !isNaN(num);}

if (!fs.existsSync(__dirname+"/cache")) {
	fs.mkdirSync(__dirname+"/cache");
}

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

	var ftpconn = new ftp({host: host, user: "anonymous", port: port, pass: ""});

	ftpconn.ls(path, function(err, tmp) {if (err) return console.error(err);callback(tmp)});

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
		if (err || response.statusCode !== 200) {
			console.log('Request error.');
			console.log(err);
			callback(500);
			return;
		}
		console.log("Received response from " + dir);

		$ = cheerio.load(body);
		
		var dirs = [];
		var d = 0;
						
		$('a').each(function () {
			var href = $(this).attr('href');
			var text = $(this).text();
			if (typeof(href) === "undefined") return;
			if (typeof(text) === "undefined") text="";

 			// Skip parent directory link and files that start with "?".
			if (!href.match(/^\?/) && !text.match("Parent Directory")) {
					if (href.match(/\/$/)) {
						dirs[d] = dir + href;
						if (debug) console.log("Directory: " + dirs[d]);
						if (recursive) getlisthttp(dirs[d], recursive, job, callback);
						d = d+1;
					} else {
						getlisthttp.work[job].files[getlisthttp.work[job].f] = dir + href;
						getlisthttp.work[job].f = getlisthttp.work[job].f+1;							
					}
				}							
			});				
			getlisthttp.work[job].Nr = getlisthttp.work[job].Nr-1					
			if (d == 0 && getlisthttp.work[job].Nr == 0) {
				// No directories at this level and no pending requests.
				callback(getlisthttp.work[job].files);
			}
			
			//if (!recursive) callback([])	

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

app.get('/', function(req, res){
	res.redirect(301,"http://lsremote.info/");
})

//var job = 0;
var cache = {};
app.get('/lsremote.js', function(req, res){
	res.contentType("html");
	
	function s2b(str) {if (str === "true") {return true} else {return false}}
	function s2i(str) {return parseInt(str)}
	
	var pattern     = req.query.pattern			|| "";
	var modifiers   = req.query.modifiers		|| "";	
	var dir         = req.query.dir				|| "";
	var maxage      = s2i(req.query.maxage		|| "3600");
	var recursive   = s2b(req.query.recursive	|| "false");
	var forceUpdate = s2b(req.query.forceUpdate	|| "false");
	console.log("Request: " + req.originalUrl);
	
	if (false) {
		// Check last-modified header.
		// Generally this is not sent by apache, so skip.
		var urlparts = url.parse(dir);
		if (dir.match(/^http[s]?/)) {
			var options = {method: 'HEAD', host: urlparts.hostname, port: 80, path: urlparts.pathname};
			var req = http.request(options, function(res) {
		    		console.log(JSON.stringify(res.headers['last-modified']));
		  	});
			req.end();
		}
	}
	
	// TODO: Store md5(dir) and md5(dir+pattern+modifiers+recursive)
	//       If md5(dir) exists, use it.
	var reqmd5 = crypto.createHash("md5").update(dir+recursive).digest("hex");

	var fname = __dirname + "/cache/" + reqmd5 + ".json";
	console.log(fname);
	if (fs.existsSync(fname)) {
		var stats = fs.lstatSync(fname);
		t0 = new Date(stats.mtime).getTime();
		tn = new Date().getTime();
		if (tn-t0 > 1000*maxage) {
			//console.log(tn-t0);
			//console.log(1000*maxage);
			//console.log("Cache expired");
			delete cache[reqmd5];
			fs.unlinkSync(fname);
		}
	}

	if (!forceUpdate && !cache[reqmd5]) {
		
		if (fs.existsSync(fname)) {
			if (debug) console.log("Sending result from file cache.");
			var data = fs.readFileSync(fname);
			if (pattern !== "") { 
				res.send(JSON.parse(data).filter(function (val) {return val.match(new RegExp(pattern, modifiers), modifiers)}));
			} else {	
				res.send(JSON.parse(data));
			}
			if (debug) console.log("Placing result in memory cache.");
			cache[reqmd5] = JSON.parse(data);
			return;
		}
	}
		
	if (!forceUpdate && cache[reqmd5]) {
		if (debug) console.log("Sending result from memory cache.");
		if (pattern !== "") { 
			res.send(cache[reqmd5].filter(function (val) {return val.match(new RegExp(pattern, modifiers), modifiers)}));
		} else {	
			res.send(cache[reqmd5]);
		}
		
		// TODO: Remove oldest first.  Constrain cache based on memory, not length.
		if (Object.keys(cache).length > maxCache) {
			if (debug) console.log("Trimming in-memory cache.");
			delete cache[Object.keys(cache)[0]];
		}
		return;
	}
	
	if (dir === "") {
		res.send("A directory must be specified");
		return;
	}
	
	if (dir.match(/^file|^\//)) {
		if (!(req.connection.remoteAddress === req.connection.address().address)) {
			var msg = "Listing of server filesystem directory is only allowed if client IP (" + req.connection.remoteAddress + ") = server IP ("+req.connection.address().address+")";
			console.log(msg);
			res.send(403, msg);
			return;
		}	
	}

	lsremote(dir, recursive, reqmd5, function (files,err) {
		if (files == 500) {
 			res.send(500,err);
 			return;
 		}
		if (debug) console.log("Sending response.");
		if (pattern !== "") { 
			res.send(files.filter(function (val) {return val.match(new RegExp(pattern, modifiers), modifiers)}));
		} else {	
			res.send(files);
		}
		if (debug) console.log("Writing file cache.");
		fs.writeFileSync(__dirname + "/cache/" + reqmd5 + ".json", JSON.stringify(files));
		
	});	
});

server.listen(port);