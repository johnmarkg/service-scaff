(function() {

	var fs = require('fs');
	var debug = require('debug')('express-scaffold')

	var express = require('express');

	// var redis = require('redis');
	var RedisStore = require('connect-redis')(require('express-session'));

	var Passport = require('passport').Passport
	var LocalStrategy = require('passport-local').Strategy;
	var LocalAPIKeyStrategy = require('passport-localapikey').Strategy;
	var RememberMeStrategy = require('passport-remember-me').Strategy;


	var util = require("util");
	var Rabbus = require("rabbus");

	// var _ = require('underscore')

	function Scaff() {

		this.rememberMeCookieLabel = 'rememberMe'
		this.sessionCookieLabel = 'sessionId'
		this.morgan = require('morgan');

		this.debug = debug;

		return this;
	}

	// export constructor
	exports = module.exports = new Scaff();

	// use this to get a new, non cached object 
	Scaff.prototype.ServiceScaff = function() {
		return new Scaff();
	};


	Scaff.prototype.express = function() {
		// dont want cached object
		this.passport = new Passport();		

		this.app = express();
		this.app.disable('x-powered-by');

		// bind express functions to this
		this.set = this.app.set.bind(this.app)
		this.use = this.app.use.bind(this.app)
		this.get = this.app.get.bind(this.app)
		this.post = this.app.post.bind(this.app)
		this.delete = this.app.delete.bind(this.app)
		this.put = this.app.put.bind(this.app)


		this.app.redis = this.redis.bind(this)
		this.app.mysql = this.mysql.bind(this)
		this.app.mongo = this.mongo.bind(this)
		this.app.sphinxql = this.sphinxql.bind(this)
		this.app.rabbitSend = this.rabbitSend.bind(this)	
		this.app.rabbitRequest = this.rabbitRequest.bind(this)	

		this.app.setStatus = this.setStatus.bind(this)
		this.app.getStatus = this.getStatus.bind(this)
		this.app.getStatusAll = this.getStatusAll.bind(this)
		this.app.incrmentStatus = this.incrementStatus.bind(this)

		return this;
	};

	//----------------------------------------
	// setters/getters
	//----------------------------------------
	Scaff.prototype.redis = function(_redis) {
		if(typeof _redis === 'undefined'){
			return this._redis;	
		}

		// janky client object detection
		if(_redis._events){
			debug('passed redis client');
		}
		else{
			debug('passed redis config');
			this._redisConfig = _redis;
			_redis = require('redis').createClient(_redis.port, _redis.host, _redis.options)
		}

		this._redis = _redis;
		return this;
	}
	

    // returns a Promise
    Scaff.prototype.mongo = function(_mongo) {
		if(typeof _mongo === 'undefined'){
			return this._mongo;	
		}    	

		var t = this;
		// janky client object detection
		if(_mongo._events){
			debug('passed mongo client')
		}
		else{
			 this._mongoConfig = _mongo;

			var MongoClient = require('mongodb').MongoClient;
			var mongoURI = 'mongodb://' + _mongo.host + ':' + _mongo.port + '/' + _mongo.db;
			MongoClient.connect(mongoURI, function (err, _db) {
				if(err){ throw err; }
				// _mongo = _db;
				t._mongo = _db;
			})


		}
		
        return this;
    }

	Scaff.prototype.sphinxql = function(_sphinxql) {
		if(typeof _sphinxql === 'undefined'){
			return this._sphinxql;	
		}

		// janky client object detection
		if(_sphinxql._events){
			debug('passed sphinxql client')
		}
		else{
			 this._sphinxqlConfig = _sphinxql;
			_sphinxql = require('mysql').createPool(_sphinxql)
		}
		this._sphinxql = _sphinxql;
		return this;
	}
	Scaff.prototype.mysql = function(_mysql) {
		if(typeof _mysql === 'undefined'){
			return this._mysql;	
		}

		// janky client object detection
		if(_mysql._events){
			debug('passed mysql client')
		}
		else{
			// _mysql = require('mysql').createConnection(_mysql)
			 this._mysqlConfig = _mysql;
			_mysql = require('mysql').createPool(_mysql)
		}
		this._mysql = _mysql;
		// console.info(_mysql)
		return this;
	}

	Scaff.prototype.rabbit = function(wascallyConfig, cb) {
		if(typeof wascallyConfig === 'undefined'){
			return this._wascally;	
		}

		var config = {};
		// // janky client object detection
		// if(_rabbit._events){
		// 	debug('passed rabbit')
		// }
		// else{
		if(!wascallyConfig.connection){
			config.connection = wascallyConfig
		}
		else{
			config = wascallyConfig	
		}

		// var prefix = config.connection.prefix || 'default';

		this._rabbitConfig = config;
	    this._wascally = require( 'wascally' );
	    // _rabbit = require( 'lapin' )( this._wascally );

	    this._wascally.configure(config).done(function(){

	    	if(typeof cb === 'function'){
	    		cb();
	    	}
	    });

		// this._rabbit = _rabbit;
		return this;
	}

	
	Scaff.prototype.cookieConfig = function(_config) {
		this._cookieConfig = _config;
		return this;
	}

	//----------------------------------------
	// rabbit
	//----------------------------------------
	function Receiver(rabbus, version, label, limit) {
		var prefix = 'send-rec.';
		return Rabbus.Receiver.call(this, rabbus, {
			exchange: prefix + version + "-exchange",
			queue: {
				name: prefix + version + '.' + label ,
				limit: typeof limit === 'number' ? limit : 1
			},
			routingKey: version + '.' + label,
			messageType: prefix + version + '.' + label
		});
	}
	util.inherits(Receiver, Rabbus.Receiver);

	function Sender(rabbus, version, label) {
		var prefix = 'send-rec.';
		return Rabbus.Sender.call(this, rabbus, {
			exchange: prefix + version + "-exchange",
			routingKey: version + '.' + label,
			messageType: prefix + version + '.' + label
		});
	}
	util.inherits(Sender, Rabbus.Sender);

	function Responder(rabbus, version, label, limit) {
		var prefix = 'req-res.';
		return Rabbus.Responder.call(this, rabbus, {
			exchange: prefix + version + "-exchange",
			queue: {
				name: prefix + version + '.' + label ,
				limit: typeof limit === 'number' ? limit : 1
			},
			routingKey: version + '.' + label,
			messageType: prefix + version + '.' + label
		});
	}
	util.inherits(Responder, Rabbus.Responder);

	function Requester(rabbus, version, label) {
		var prefix = 'req-res.';

		return Rabbus.Requester.call(this, rabbus, {
			exchange: prefix + version + "-exchange",
			routingKey: version + '.' + label,
			messageType: prefix + version + '.' + label
		});
	}
	util.inherits(Requester, Rabbus.Requester);


	Scaff.prototype.rabbitRespond = function(queue, limit, handler){
		var version = this._rabbitConfig.connection.prefix || 'default'
		var responder = new Responder(this._wascally, version, queue, limit);
		responder.handle(handler);		
	}
	Scaff.prototype.rabbitRequest = function(label, msg, cb){
		var version = this._rabbitConfig.connection.prefix || 'default'
		if(!this.requesters){
			this.requesters = {}
		}
		var key = version + '-' + label;
		if(!this.requesters[key]){
			this.requesters[key] = new Requester(
				this._wascally, 
				version, 
				label
			);
		}

		this.requesters[key].request(msg, cb);
	}


	Scaff.prototype.rabbitReceive = function(queue, limit, handler){
		var version = this._rabbitConfig.connection.prefix || 'default'
		var receiver = new Receiver(this._wascally, version, queue, limit);
		receiver.receive(handler);		
	}
	Scaff.prototype.rabbitSend = function(label, msg, cb){
		var version = this._rabbitConfig.connection.prefix || 'default'
		if(!this.senders){
			this.senders = {}
		}
		var key = version + '-' + label;
		if(!this.senders[key]){
			this.senders[key] = new Sender(
				this._wascally, 
				version, 
				label
			);
		}

		this.senders[key].send(msg, cb);
	}

	//----------------------------------------
	// helpers
	//----------------------------------------
	Scaff.prototype.web = function() {



		this
			.express()
			.addCookieParser()
			.addGzip()
			.addQueryAndBodyParser();

		// if (this._redis) {
			this
				.addRedisSessions()
				.authenticationRememberMe()
		// }

		// if (this._mysql) {
			this
				.authenticationApikey()
				.authenticationLogin()
		// }

		return this;
	}

	Scaff.prototype.api = function(redisConfig) {
		this
			.express()
			.addCookieParser()
			.addGzip()
			.addQueryAndBodyParser();

		// if (this._redis) {
			this
				.addRedisSessions()
				// .authenticationRememberMe()
		// }

		// if (this._mysql) {
			this
				.authenticationApikey()
				// .authenticationLogin()
		// }

		return this;
	}

	//----------------------------------------
	// static files, templates
	//----------------------------------------
	Scaff.prototype.addStaticDir = function(dir, route) {
		if (!dir) {
			throw new Error('addStaticDir: dir required')
		}

		try {
			var stat = fs.statSync(dir);
			if (!stat.isDirectory()) {
				throw new Error('addStaticDir: `' + dir + '` is not a directory')
			}
		} catch (err) {
			throw err
		}

		debug('addStaticDir: ' + dir + ', ' + route)

		if (route) {
			this.app.use(route, express.static(dir));
		} else {
			this.app.use(express.static(dir));
		}

		return this;
	}
	Scaff.prototype.addJade = function(dir) {
		if (!dir) {
			throw new Error('addJade: dir required')
		}
		try {
			var stat = fs.statSync(dir);
			if (!stat.isDirectory()) {
				throw new Error('addJade: `' + dir + '` is not a directory')
			}
		} catch (err) {
			throw err
		}
		// if(!options){
		// 	options = {
		// 		prettyprint: true
		// 	};
		// }

		this.app.set('views', dir);
		this.app.set('view engine', 'jade');
		// this.app.set('view options', options);
		return this;
	}


	//----------------------------------------
	// status functions
	//----------------------------------------
	function haveRedisClient(_this, cb){
        if(!_this.redis()){
        	var err = new Error('no redis client set')
        	if(typeof cb === 'function'){
				cb(err)
				return false;
        	}
        	else{
	        	throw err
	        }
	        
        }		
        return true;
	}

	Scaff.prototype.setStatus = function(key,field,val,cb){
        debug('setStatus ' + key  + ', ' + field +': ' +val)
        if(!haveRedisClient(this,cb)){
        	return;
        }
		this.redis().hset(key,field,val,cb)
	}
	Scaff.prototype.getStatusAll = function(key,cb){
        debug('getStatusAll ' + key )

        if(!haveRedisClient(this,cb)){
        	return;
        }

		this.redis().hgetall(key,cb)

	}
	Scaff.prototype.getStatus = function(key,field,cb){
        if(!haveRedisClient(this,cb)){
        	return;
        }	
        this.redis().hget(key,field,cb)	
	}
    // Scaff.prototype.delStatusAll = function(key,cb){
    //     if(!haveRedisClient(this,cb)){
    //     	return;
    //     }	
    //     this.redis().del(key,cb)    	
    // }
	Scaff.prototype.incrementStatus = function(key,field,val,cb){
        debug('incrementStatus ' + key  + ', ' + field +': ' +val)
        if(!haveRedisClient(this,cb)){
        	return;
        }	
        this.redis().hincrby(key,field,val,cb)        
	}

	//----------------------------------------
	// basic middleware
	//----------------------------------------
	Scaff.prototype.addQueryAndBodyParser = function() {
		debug('addQueryAndBodyParser')
		var bodyParser = require('body-parser');

		this.app.use(bodyParser.json());
		this.app.use(bodyParser.urlencoded({
			extended: false
		}));

		return this;
	}

	Scaff.prototype.addCookieParser = function() {
		debug('addCookieParser')
		if (this.addedCookieParser) {
			return this;
		}
		var cookieParser = require('cookie-parser');
		this.app.use(cookieParser());
		this.addedCookieParser = true;
		return this;
	}

	Scaff.prototype.addGzip = function(options) {
		debug('addGzip: ' + JSON.stringify(options || {}));
		if (this.addedGzip) {
			return this;
		}

		var compression = require('compression')
		this.app.use(compression(options || {}));
		this.addedGzip = true;
		return this;
	}

	//----------------------------------------
	// sessions
	//----------------------------------------	
	Scaff.prototype.addRedisSessions = function(redisConfig, _sessionConfig, _cookieConfig) {
		debug('addRedisSessions')

		if(typeof redisConfig === 'undefined'){
			if(!this._redis){
				throw new Error('redis config or client required')
			}
			redisConfig = {
				client: this._redis
			}
		}

		var sessionConfig = _sessionConfig || {};
		var cookieConfig = _cookieConfig || this._cookieConfig || {};

		this.addCookieParser();
		this.addQueryAndBodyParser();

		// defaults
		var _config = {
			secret: 'do it',
			key: this.sessionCookieLabel,
			store: new RedisStore(redisConfig),
			cookie: {
				httpOnly: true,
				maxAge: null //cookie destroyed browser when is closed
			},
			resave: true,
			saveUninitialized: false,
			secure: false
		};

		for (var key in sessionConfig) {
			_config[key] = sessionConfig[key]
		}

		for (var key in cookieConfig) {
			_config.cookie[key] = cookieConfig[key]
		}

		var session = require('express-session');
		this.app.use(session(_config));

		return this;
	}

	//----------------------------------------
	// passport
	//----------------------------------------
	Scaff.prototype.serializeUser = function(user, done) {
		debug('default serializeUser: ' + JSON.stringify(user));
		done(null, user);
	}

	Scaff.prototype.deserializeUser = function(string, done) {
		debug('default deserializeUser: ' + string);

		var q = 'select u.* , GROUP_CONCAT( role ) roles from users u  join user_roles r on(u.id=r.user_id)  where id = ? group by user_id'
		var p = [string]
		this._mysql.query(q, p, function(err, rows) {
			debug('deserializeUser query cb')
			debug(JSON.stringify(arguments))
			if (err) {
				return done(err)
			}
			debug(rows[0].roles)
			if(rows[0].roles){

				var roles = rows[0].roles.split(',');
				debug(roles)
				rows[0].roles = {};
				
				for(var i in roles){
					rows[0].roles[roles[i]] = true;
				}
			}

			delete rows[0].password;
			debug(JSON.stringify(rows[0]))			
			return done(null, rows[0])
		})
	}

	Scaff.prototype.initPassport = function() {
		this.passport.deserializeUser(this.deserializeUser.bind(this));
		this.passport.serializeUser(this.serializeUser.bind(this));

		if (this.passportInitialized) {
			return this;
		}
		this.passportInitialized = true;

		this.app.use(this.passport.initialize());

		// this is strategy that check for cookies
		this.app.use(this.passport.session());

		return this;
	}

	//----------------------------------------
	// authentication login
	//----------------------------------------	
	Scaff.prototype.loginFn = function(u, p, done) {

		if (!this._mysql) {
			return done(new Error('mysql requied for login auth'));
		}

		var query = "select id, active from users where username = ? and password = ?";
		var params = [u, p];

		this._mysql.query(query, params, function(err, results) {
			if (err) {
				return done(err);
			} else if (!results || results.length === 0) {
				return done(null, false, {
					message: 'Unknown user'
				});
			} else if (!results[0].active || results[0].active === 0) {
				return done(null, false, {
					message: 'Account is not active'
				});
			}
			else{ 
				return done(null, results[0].id);
			}
		});
	}


	Scaff.prototype.authenticationLogin = function() {
		debug('authenticationLogin');

		if (this.addedAuthenticationLogin) {
			debug('already added ')
			return this;
		}
		this.addedAuthenticationLogin = true;

		var local = new LocalStrategy({
			// passReqToCallback: true
		}, this.loginFn.bind(this));
		this.passport.use(local);

		return this.initPassport();
	}

	//----------------------------------------
	// authentication remember me
	//----------------------------------------
	Scaff.prototype.verifyRememberMe = function(token, done) {
		debug('verifyRememberMe: ' + token)
		if (!this.redis()) {
			throw new Error('default verifyRememberMe requires redis client');
		}
		var t = this;
		// get user id associated with token
		this.redis().get(
			'remember_me-' + token,
			function(err, userId){
				if(err){ return done(err); }

				// verify token is still valid
				var userKey = 'remember_me-' + parseInt(userId, 10)
				t.redis().sismember(
					userKey,
					token,
					function(err){
						done(err, userId)
					}
				)

			}

		);


	}
	Scaff.prototype.clearUsersRememberMe = function(userId, done) {
		var userKey = 'remember_me-' + parseInt(userId, 10)
		if (!this.redis()) {
			throw new Error('default clearUsersRememberMe requires redis client or config')
		}
		this.redis().del(userKey, done);
	}


	Scaff.prototype.issueRememberMe = function(userId, done) {
		debug('issueRememberMe: ' + userId)
		var t = this;

		userId = parseInt(userId, 10)
		if(isNaN(userId) || userId < 1){
			return done('invalid userId');
		}

		if (!this.redis()) {
			throw new Error('default verifyRememberMe requires redis client or config')
		}
		var guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random() * 16 | 0,
				v = c === 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});

		var key = 'remember_me-' + guid;
		var userKey = 'remember_me-' + userId
		var expires = (1000 * 60 * 60 * 24 * 30) // 30 days
		this.redis().setex(
			key,
			expires,
			userId, 
			function(err) {
				if(err){
					return done(err)
				}				
				t.redis().sadd(userKey, guid, function(err){
					if(err){
						return done(err)
					}
					done(null, guid);
				})
			}
		);		
	}

	Scaff.prototype.authenticationRememberMe = function() {
		debug('authenticationRememberMe');

		// if(typeof verify === 'function'){ this.verifyRememberMe = verify }
		// if(typeof issue === 'function'){ this.issueRememberMe = issue }
		var t = this;
		this.addCookieParser();

		this.passport.use(
			new RememberMeStrategy({
					key: t.rememberMeCookieLabel
				},
				this.verifyRememberMe.bind(this),
				this.issueRememberMe.bind(this)
			)
		);

		this.initPassport();
		// flag for authenticationHandler, send cookie to client
		this.rememberMe = true;

		this.app.use(this.passport.authenticate('remember-me'));

		return this;
	}

	//----------------------------------------
	// authentication apikey
	//----------------------------------------
	Scaff.prototype.apiAuth = function(req, key, done) {
		if (!this._mysql) {
			return done(new Error('mysql client required for api auth'))
		}

		var q = "select u.id from  api_keys k join users u on (k.user_id = u.id) where apikey = ?";

		this._mysql.query(q, [key], function(err, results) {

			if (err) {
				return done(null, false, {
					message: 'ERROR Authenticating'
				});
			} else if (!results || results.length === 0) {
				return done(null, false, {
					message: 'Unknown user'
				});
			} else if (results && results[0] && results[0].active === 0) {
				return done(null, false, {
					message: 'Account is not active'
				});
			}

			done(null, {
				id: results[0].id
			});
		});
	}

	Scaff.prototype.authenticationApikey = function() {
		debug('authenticationApikey');
		var t = this;

		this.passport.use(new LocalAPIKeyStrategy({
			passReqToCallback: true
		}, t.apiAuth.bind(this)));

		return this.initPassport();
	}

	//----------------------------------------
	// authentication helpers
	//----------------------------------------
	Scaff.prototype.authenticateHandler = function(err, user, info, req, res, next) {
		var t = this;
		debug('authenticationHandler: ' + user)
		if (err) {
			debug('authenticationHandler: authentication error')
			return next(err);
		}
		if (!user) {
			debug('authenticationHandler: no user')
			return t.loginFail(req, res, info);
		}

		// debug('user: '+ JSON.stringify(user));

		// start and save session
		if (info && info.session) {
			req.login(user, {
				session: true
			}, function(err) {

				debug('authenticationHandler: login')
				if (err) {
					debug('authenticationHandler: login err')
					return next(err);
				}

				if (t.rememberMe && req.body && req.body.remember_me) {

					debug('authenticationHandler: remember me')
					t.issueRememberMe(req.user, function(err, token) {
						if (err) {
							debug('authenticationHandler: rememberMe err')
							return next(err);
						}
						res.cookie(t.rememberMeCookieLabel, token, {
							path: '/',
							httpOnly: true,
							maxAge: 604800000
						});
						t.loginSuccess(req, res, user, info);
					})
				} else {
					t.loginSuccess(req, res, user, info);
				}

			});
		}

		// no session (api requests)
		// 
		// cant use req.login as it will create a session and send
		// a session cookie in response headers
		else {
			this.deserializeUser(user.id, function(err, _user) {
				if (err) {
					return next(err)
				}

				req.user = _user
				next()
			})
		}
	}

	Scaff.prototype.loginSuccess = function(req, res, info) {
		debug('loginSuccess')
		debug(JSON.stringify(req.user));
		req.user.adminUserView = (info && info.adminUserView);

		res.status(200)
		return res.json({
			success: true
		});
	}

	Scaff.prototype.loginFail = function(req, res, info) {

		res.status(401)
		return res.json({
			success: false,
			error: info.message
		});
	}

	//----------------------------------------
	// roles
	//----------------------------------------
	Scaff.prototype.checkRoles = function(roles, req, res, next) {

		if(roleTest(roles, req)){
			return next();		
		}

		res.status(403);
		return res.end('insufficient premissions');
	}
	Scaff.prototype.checkRolesWrapper = function(roles, fn, req, res, next) {

		if(roleTest(roles, req)){
			return fn(req, res, next)	
		}

		return next();
	}

	function roleTest(roles, req){
		var r = req.user && req.user.roles  ? req.user.roles : {};

		// // get array intersection
		// // http://stackoverflow.com/questions/1885557/simplest-code-for-array-intersection-in-javascript/1885569#1885569
		// var match = r.filter(function(n) {
		//     return roles.indexOf(n) != -1
		// });		
		// if(match.length > 0){
		// 	return true;
		// }		
		// return false;

		for(var i in roles){
			if(r[roles[i]]){
				return true
			}
		}
		return false;
	}


	//----------------------------------------
	// logging
	//----------------------------------------
	Scaff.prototype.addLogger = function(tokens, immediate) {

		function skipFn(req, res) {
			if (req.query && req.query.noLog) {
				return true;
			}
		}

		var morganFn = this.morgan(tokens || '[:date[iso]] :method :url HTTP/:http-version :status :res[content-length] ":referrer" ":user-agent"', {
			immediate: immediate,
			skip: skipFn
		});

		var manualLogger = this.morgan(tokens || '[:date[iso]] :method :url', {
			immediate: true
		});

		this.app.use(morganFn);


		this.log = function(string){
			var req = {
				url: string,
				method: 'LOG'
			}
			
			manualLogger(req, {}, function(){})
			return this;
		}
		this.app.log = this.log.bind(this);

		return this;
	}


	//----------------------------------------
	// start/stop server
	//----------------------------------------
	Scaff.prototype.start = function(port, cb) {

		var app = this.app;
		var t = this;

		if (typeof port == 'undefined') {
			throw new Error('port required')
		}


		app.listen(port, function() {
			t.server = this;
			debug(
				process.title + " listening on port %d (pid: " + process.pid + ")",
				this.address().port
			);

			
			

			if (process.send) {
				// for naught
				process.send('online');
			}
			if (cb && typeof cb === 'function') {
				cb(null, this.address().port);
			}
		});

		/* istanbul ignore next */
		process.on('message', function(message) {
			if (message === 'shutdown') {
				debug(process.pid + " Received shutdown message, shutting down gracefully.")
				t.shutdown();
			}
		});

		/* istanbul ignore next */
		process.on('SIGTERM', function() {
			console.log(process.pid + " Received kill signal (SIGTERM), shutting down gracefully.")
			t.shutdown();
		})
	}

	Scaff.prototype.shutdown = function(msg) {

		this.server.close(function() {
			debug("server stopped accepting connections")
			if(msg){
				console.info(msg)	
			}
			
			if (process.send) {
				process.send('offline');
			}			
		})
		// var t = this;
		// var wait = (this.shutdownTimeout || 1 * 60 * 1000);
		// setTimeout(function() {
		// 	console.error(process.pid + " Could not close connections in time, forcefully shutting down (waited " + wait + "ms) ")
		// 	delete t.server;	
		// 	// process.exit(1)
		// }, wait);
	}

	//----------------------------------------
	// middleware
	//----------------------------------------
	Scaff.prototype.authenticated = function(req, res, next) {
		var t = this

		if (!req.isAuthenticated()) {
			debug('not authenticated, check apikey');

			this.passport.authenticate('localapikey', function(err, user, info) {
				t.authenticateHandler(err, user, info, req, res, next)
			})(req, res, next);
		} else {
			next()
		}
	}

	Scaff.prototype.errorHandler = function() {
		debug('add errorHandler')
		var t = this;
		this.app.use(function(error, req, res, next) { 

			if (!t.app.get('dontPrintErrors')) {
				console.error('errorHandler')
				console.error(error)
				console.error(error.stack);
			}

			res.status(500).send(error.toString());


			if(typeof next === 'function'){
				next()
			}

		});

		return this;
	}

	//----------------------------------------
	// routes
	//----------------------------------------
	Scaff.prototype.logout = function(req, res) {

		// clear passport session
		req.logout();

		// clear session in store
		req.session.destroy();

		// reset client cookies
		res.cookie(this.sessionCookieLabel, '');
		// res.cookie(this.rememberMeCookieLabel, '');

		res.redirect('/'); 
	};

	Scaff.prototype.login = function(req, res, next) {
		var t = this;

		this.passport.authenticate('local', function(err, user, info) {
			debug('local authenticate cb: ' + user)
			debug(JSON.stringify(info))
			if (!info) {
				info = {};
			}
			info.session = true;
			t.authenticateHandler(err, user, info, req, res, next);
		})(req, res, next);
	}

})(this);