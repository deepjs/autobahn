/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
var express = require('express'),
	deep = require("deepjs"),
	crypto = require("crypto");
	require("deepjs/lib/unit");
	require("deepjs/lib/schema");
var closure = {
	app:null
};

/**
 * TODO : 
 *
 * app.autobahn.service.use("/campaign/s:id", { get:..., post:... })
 * app.autobahn.service.use("/campaign/s:id", function(object, options){})
 * app.autobahn.service.get("/campaign/[(s:id/p:path),q:query]", function(param, options){})
 * 
 */

deep.setApp = function(app){
	closure.app = app;
};
//________________________________________ 
deep.utils.Hash = function(string, algo)
{
	return crypto.createHash(algo || 'sha1').update(string).digest('hex');
};
//_________________________
/**
 * start a chain with provided session.
 * @param  {[type]} session [description]
 * @return {[type]}         [description]
 */
deep.session = function(session){
	if(!session)
		return deep.context.session;
	return deep({}).session(session);
};
deep.Chain.add("session", function (session) {
	var self = this;
	var func = function (s, e) {
		if(!closure.app)
			return deep.errors.Error(500, "No app setted in deep to manipulate session.");
		if(!self._contextCopied)
			deep.context = self._context = deep.utils.simpleCopy(self._context);
		self._contextCopied = true;
		self._context.session = session;
		self.oldQueue = self._queue;
		self._queue = [];
		if(session.user && closure.app.autobahn.loggedIn)
			return deep.when(closure.app.autobahn.loggedIn(session))
			.done(closure.app.autobahn.getModes)
			.done(function(modes){
				self.modes(modes);
				return s;
			});
		self.modes(closure.app.autobahn.getModes(session));
		return s;
	};
	func._isDone_ = true;
	deep.utils.addInChain.call(self, func);
	return this;
});
//_________________________

/**
 * login : means create a chain that hold a context that mimics a full login from outside
 * (credentials will be validate as trough real login, and session (in chain context) will be decorated with same methods)
 * The roles of the chain is automatically set to the one from user
 * @param  {[type]} obj [description]
 * @return {[type]}     [description]
 */
deep.login = function(obj){
	return deep({}).login(obj);
};
deep.Chain.add("login", function (datas) {
	var self = this;
	var func = function (s, e) {
		if(!closure.app)
			return deep.errors.Error(500, "No app setted in deep to manipulate session.");
		if(!self._contextCopied)
			deep.context = self._context = deep.utils.simpleCopy(self._context);
		self._contextCopied = true;
		self._context.session = {};
		self.oldQueue = self._queue;
		self._queue = [];
		return deep.when(closure.app.autobahn.userHandlers.login(datas, self._context.session))
		.done(function(user){
			self.modes(closure.app.autobahn.getModes(self._context.session));
			return s;
		});
	};
	func._isDone_ = true;
	deep.utils.addInChain.call(self, func);
	return this;
});
//_________________________
/**
 * logout : means  : if you have previously use deep.login or chain.login : it will destroy the session of current chain context.
 * @return {[type]} [description]
 */
deep.Chain.add("logout", function () {
	var self = this;
	var func = function (s, e) {
		if(self._context.session)
		{
			if(self._context.session.impersonations)
				self._context.session = self._context.impersonations.pop();
			else
				delete self._context.session;
		}
		return s;
	};
	func._isDone_ = true;
	deep.utils.addInChain.call(self, func);
	return this;
});

//_________________________
/**
 * Impersonate means : (always in local chains context)
 * mimics a login with only a user ID.
 * @param  {[type]} user [description]
 * @return {[type]}      [description]
 */
deep.impersonate = function(user){
	return deep({}).impersonate(user);
};
deep.Chain.add("impersonate", function (user) {
	var self = this;
	var func = function (s, e) {
		if(!self._contextCopied)
			deep.context = self._context = deep.utils.simpleCopy(self._context);
		self._contextCopied = true;
		var oldSession = self._context.session;
		self.context.impersonations = self.context.impersonations;
		if(oldSession)
			self.context.impersonations.push(oldSession);
		self._context.session = {};
		self.oldQueue = self._queue;
		self._queue = [];
		return deep.when(closure.app.autobahn.userHandlers.impersonate(user, self._context.session))
		.done(function(user){
			self.modes(closure.app.autobahn.getModes(self._context.session));
			return s;
		});
	};
	func._isDone_ = true;
	deep.utils.addInChain.call(self, func);
	return this;
});


/*
	var config = {
		port:3000,
		services:"./services.js",
		htmls:"./html.js",
		statics:"./statics.js",
		modules:["smart-common"],
		errors:{
			NotFound:null
		},
		user:{
			store:"user",
			encryption:"sha1",
			login:{
				loginField:"email",
				passwordField:"password",
				schema:{},
				allowImpersonation:["admin"],
				loggedIn:function(session, user){
					// do (a)synch stuffs to decorate session
				}
			},
			register:{
				services:{
					"/register/s:id/s:email":{
						get:function(params, options){}
					},
					"/register":{
						schema:{},
						post:function(object, options){}
					}
				}
				redirection:"/#/register-confirmation",
				email:{
					template:"swig::./templates/...",
					reply:"info@brol.com"
				}
			},
			changePassword:{
				schema:{},
				redirection:"/#/changePassword-confirmation",
				email:{
					//...
				}
			}
		},
		session:{
			secret: 'paezijp7YlhgiGOUYgtogz',
			maxAge: new Date(Date.now() + 3600000)
		},
		getModes:function(session){
			if(session && session.user)
				return { roles:"user" };
			return { roles:"public" };
		},
		protocols:{
			
		}
	}


 */
module.exports = {
	init:function(config){
		config = config || {};
		var app = express();
		app.autobahn = config;

		if(typeof config.services === 'string')
			config.services = require(config.services);
		if(typeof config.htmls === 'string')
			config.htmls = require(config.htmls);
		if(typeof config.statics === 'string')
			config.statics = require(config.statics);

		app.autobahn.getModes = config.getModes || this.getModes;
		app.use(express.cookieParser());
		if(config.session)
			app.use(express.session(config.session));
		app.use(express.bodyParser())
		.use(this.context.middleware(config.contextInit))
		.use(this.modes.middleware(app.autobahn.getModes));
		if(config.protocols)
			app.use(this.protocols.middleware(config.protocols));

		if(config.user)
		{
			if(!config.session)
				throw deep.errors.Error(500, "autobahn init failed : you need session to manage users");
			// set simple session management (pure expressjs)
			app.autobahn.loggedIn = config.user.loggedIn || null;

			// to get body parsed automatically (json/files/..)

			// ------ USER LOGIN/LOGOUT/ROLES MANAGEMENT
			app.post("/logout", this.logout.middleware());	// use this middleware to logout : you just need to post anything on it.
			
			config.user.login = config.user.login || {};
			config.user.login.store =config.user.store || "user";
			config.user.login.encryption = config.user.encryption;
			config.user.login.loginField = config.user.login.loginField || "email";
			config.user.login.passwordField = config.user.login.passwordField || "password";
			config.user.login.loggedIn = config.user.loggedIn || null;

			if(!config.loginHandlers)
				config.loginHandlers = this.login.createHandlers(config.user.login);

			app.post("/login", this.login.middleware(config.loginHandlers)); // use this middleware to login. it will look after 'user' protocol (or you could give directly the store reference (or its OCM manager)), and check posted email/password combination in provided store.
			/*
			if(config.user.register)
			{
				config.user.register.store = config.user.store;
				config.user.register.encryption = config.user.encryption;
				config.services = config.services || {};
				this.register(config.services, config.user.register);
			}
			if(config.user.changePassword)
			{
				config.user.changePassword.store = config.user.store;
				config.user.changePassword.encryption = config.user.encryption;
				config.services = config.services || {};
				this.changePassword(config.services, config.user.changePassword);
			}*/
		}

		if(config.modules)
		{
			config.services = config.services || {};
			config.htmls = config.htmls || {};
			config.statics = config.statics || {};
			config.modules.forEach(function(module){
				require(module)(config.services, config.htmls, config.statics);
			});
		}
		///____________________________________________________  USE YOUR MAPS

		if(config.services)
			app.use(this.restful.map(config.services));
		if(config.statics)
			app.use(this.statics.middleware(config.statics));
		if(config.htmls)
			app.use(this.html.map(config.htmls));
		///____________________________________________________      Finish app construction
		app.use(app.router)
		.use((config.errors && config.errors.NotFound)? config.errors.NotFound : function(req, res, next){
			console.log("nothing to do with : ", req.url);
			res.writeHead(404, {'Content-Type': 'text/html'});
			res.end("error : 404");
		})
		.listen(config.port || 3000);

		deep.setApp(app);
		return app;
	},
	getModes : function(session){
		if(session && session.user)
		{
			if(session.user.roles)
				return { roles:session.user.roles };
			return { roles:"user" };
		}
		return { roles:"public" };
	},
	context:require("./middleware/context"),
	html:require("./middleware/html"),
	language:require("./middleware/language"),
	login:require("./middleware/login"),
	logout:require("./middleware/logout"),
	restful:require("./middleware/restful"),
	modes:require("./middleware/modes"),
	statics:require("./middleware/statics"),
	protocols:require("./middleware/protocols"),
	register:null,
	changePassword:null
};

