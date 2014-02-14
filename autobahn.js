/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
var express = require('express'),
	deep = require("deepjs"),
	crypto = require("crypto");

var closure = {
	app:null
};

deep.setApp = function(app){
	closure.app = app;
};
//________________________________________
deep.utils.Hash = function(string, algo)
{
	return crypto.createHash(algo || 'sha1').update(string).digest('hex');
};
deep.getRoles = function(session){
	if(session && session.user)
	{
		if(session.user.roles)
			return session.user.roles;
		return "user";
	}
	return "public";
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
deep.Chain.addHandle("session", function (session) {
	var self = this;
	var func = function (s, e) {
		if(!self._contextCopied)
			deep.context = self._context = deep.utils.simpleCopy(self._context);
		self._contextCopied = true;
		self._context.session = session;
		self.oldQueue = self._queue;
		self._queue = [];
		if(!closure.app)
			return deep.errors.Error(500, "No app setted in deep to manipulate session.");
		self.roles((closure.app.autobahn.getRoles || deep.getRoles)(session));
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
	return deep.store("json").post(obj, "/login" ).log();
};
deep.Chain.addHandle("login", function (datas) {
	var self = this;
	var func = function (s, e) {
		return deep.login(datas);
	};
	func._isDone_ = true;
	addInChain.call(self, func);
	return this;
});
//_________________________
/**
 * logout : means  : if you have previously use deep.login or chain.login : it will destroy the session of curren chain context.
 * @return {[type]} [description]
 */
deep.logout = function(){
	return deep.store("json").post({}, "/logout" ).log();
};
deep.Chain.addHandle("logout", function () {
	var self = this;
	var func = function (s, e) {
		return deep.logout();
	};
	func._isDone_ = true;
	addInChain.call(self, func);
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
	if(!session)
		return (deep.context && deep.context.session)?deep.context.session.user:undefined;
	return deep({}).sessionUser(user);
};
deep.Chain.addHandle("impersonate", function (user) {
	var self = this;
	var func = function (s, e) {
		if(!self._contextCopied)
			deep.context = self._context = deep.utils.simpleCopy(self._context);
		self._contextCopied = true;
		if(self._context.session)
			self._context.session = deep.utils.simpleCopy(self._context.session);
		else
			self._context.session = {};
		if(typeof user === 'string')
			self._context.session.remoteUser = { id:user };
		else
			self._context.session.remoteUser = user;
		self.oldQueue = self._queue;
		self._queue = [];
		self.modes("roles", (deep.context.getRoles || deep.getRoles)(self._context.session));
		return s;
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
			session:{
				secret: 'paezijp7YlhgiGOUYgtogz',
				maxAge: new Date(Date.now() + 3600000)
			},
			getRoles:function(session){
				if(session && session.user)
					return "user";
				return "public";
			},
			login:{
				login:"email",
				password:"password",
				schema:{},
				allowImpersonation:["admin"],
				loggedIn:function(session, user){
					// do asynch stuffs to get passport etc
				}
			},
			register:{
				redirection:"/#/register-confirmation",
				email:{
					template:"./templates/...",
					reply:"info@brol.com"
				}
			},
			changePassword:{
				redirection:"/#/changePassword-confirmation",
				email:{
					//...
				}
			}
		}
	}


 */
module.exports = {
	init:function(config){
		config = config || {};
		var app = express();

		if(typeof config.services === 'string')
			config.services = require(config.services);
		if(typeof config.htmls === 'string')
			config.htmls = require(config.htmls);
		if(typeof config.statics === 'string')
			config.statics = require(config.statics);

		app
		.use(this.context.middleware());	// required : it set deep.context for each request (it means that it set a unique environnement for each request)
		
		if(config.user)
		{
			if(!config.user.session)
				throw deep.errors.Error(500, "autobahn init failed : no session params found in config");
			// set simple session management (pure expressjs)
			app.autobahn.getRoles = config.user.getRoles = config.user.getRoles || deep.getRoles;
			app.autobahn.loggedIn = config.user.loggedIn || null;
			app.use(express.cookieParser())
			.use(express.session(config.user.session))
			// to get body parsed automatically (json/files/..)
			.use(express.bodyParser())
			.use(this.roles.middleware(config.user.getRoles))

			// ------ USER LOGIN/LOGOUT/ROLES MANAGEMENT
			.post("/logout", this.logout.middleware());	// use this middleware to logout : you just need to post anything on it.
			
			config.user.login = config.user.login || {};
			config.user.login.store = config.user.store;
			config.user.login.encryption = config.user.encryption;
			config.user.login.loginField = config.user.login.loginField || "email";
			config.user.login.passwordField = config.user.login.passwordField || "password";

			app.post("/login", this.login.middleware(config.user.login)); // use this middleware to login. it will look after 'user' protocol (or you could give directly the store reference (or its OCM manager)), and check posted email/password combination in provided store.
			
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
			}
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

		if(config.htmls)
			app.use(this.html.simpleMap(config.htmls));
		if(config.services)
			app.use(this.restful.map(config.services));
		if(config.statics)
			app.use(this.statics.middleware(config.statics));
		///____________________________________________________      Finish app construction
		app.use(app.router)
		.use((config.errors && config.errors.NotFound)? config.errors.NotFound : function(req, res, next){
			console.log("nothing to do with : ", req.url);
			res.writeHead(404, {'Content-Type': 'text/html'});
			res.end("error : 404");
		})
		.listen(config.port || 3000);

		app.autobahn = {
			services:config.services,
			htmls:config.htmls,
			statics:config.statics
		};

		deep.setApp(app);
		return app;
	},
	context:require("./middleware/context"),
	html:require("./middleware/html"),
	language:require("./middleware/language"),
	login:require("./middleware/login"),
	logout:require("./middleware/logout"),
	restful:require("./middleware/restful"),
	roles:require("./middleware/roles"),
	statics:require("./middleware/statics"),
	register:null,
	changePassword:null
};

