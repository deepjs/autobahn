var deep = require("deepjs"),
	express = require('express'),
	autobahn = require("autobahnjs"),	// bunch of middlware for expressjs
	Unit = require("deepjs/lib/unit");  // for deepjs unit testing

var cookieParser = require('cookie-parser');
var session = require('express-session');
var bodyParser = require('body-parser');

// bind actual JSON-Schema validator. taking one from deepjs core.
deep.Validator.set(require("deepjs/lib/schema"));

// set root path and cwd (used in certain protocol/stores/chains)
deep.globals.rootPath = __dirname;
deep.context("cwd", __dirname);

// assign default modes.
deep.Modes({
	roles:"public"
});

//_________________________ Start your app construction
var app = express();

// simple app example
var autobahnApp = autobahn.app({
	port:3000,
	// initialise context for each request
	initContext: function(context){
		// do something
		return context;
	},
	// Decorate session when logged in. 
	// Used by login middleware and chained API
	loggedIn: function(session) {
		// logged user is already stored in session.
		session.myDecoration = true;
		return session;
	},
	// Returns current request modes depending on session. 
	// Used by "modes" middleware and chained API (on login).
	sessionModes: function(session) 
	{
		// You could use session to make decision. 
		// If you have login, session contains your user.
		if (session && session.user) // if your logged in : you're a "user"
			return { roles: "user" }; 
		else // else you're "public"
			return { roles: "public" }; 
	},
	// login handler (used by login middleware and chained API)
	loginConfig: {
		store: "user",			// users collection (deepjs protocol or direct reference).
		encryption: "sha1",		// how compare login
		loginField: "email", 		// which field to look in posted json.
		passwordField: 'password'  // same
	}
}, app);

app
// set simple session management (pure expressjs)
.use(cookieParser())
.use(session({
	resave:false,
	saveUninitialized:true,
	secret: 'paezijp7YlhgiGOUYgtogz',
	maxAge: new Date(Date.now() + 3600000)
}))
// to get body parsed automatically (json/files/..)
.use(bodyParser.json({ strict:false, extended:true }))
// ------ context and modes
.use(autobahn.context.middleware())	// create and bind unique context to each incoming request
.use(autobahn.modes.middleware(autobahnApp.sessionModes)) // assign OCM modes to each incoming req. store it in previously created context
// ------ login and logout
.post("/logout", autobahn.logout.middleware()) 	// catch post on /logout and break session.
.post("/login", autobahn.login.middleware(autobahnApp))  // catch post on /login and try to login
// ------ Your maps-to-* middleware
.use(autobahn.restful.map(require("./server/services")))	// deep-restful map-to-services
.use(autobahn.html.map(require("./server/html")))			// deep-views/deep-routes map-to-html rendering.
.use(autobahn.statics.middleware(require("./server/statics"))) // map-to-statics file server
///____________________________________________________      Finish app construction
.use(function(req, res, next) {
	console.log("nothing to do with : ", req.url);
	res.writeHead(404, {
		'Content-Type': 'text/html'
	});
	res.end("error : 404");
})
.listen(autobahnApp.port);

// bind global app. Allow us to apply login/logout/impersonate (and more) from chained API.
deep.App(autobahnApp);

console.log("server is listening on port : ", autobahnApp.port);

var repl = require("repl")
.start({
	prompt: "node via stdin> ",
	input: process.stdin,
	output: process.stdout
});

