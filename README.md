# autobahnjs

deepjs/server oriented tools and middlewares for expressjs.

Autobahnjs comes with two kind of tools :

* middlewares for expressjs
	* context : assign context to each incoming request
	* modes : assign modes (ocm related) to each incoming request (based on current session)
	* restful : map-to-service middleware (HTTP/rest dynamic routing)
	* html : map-to-html middleware  (deep-views/routes render map)
	* statics : map-to-files middleware (dynamic map for statics files server)
	* login : retrieve matched user and hold user in current session.
	* logout : break current session.
* "App" object definition and tools for session/user management through deepjs chained API.


## install

As autobahnjs is an environnement that tie a bunch of tools together and should be piloted from your own index.js :
You should use the yeoman autobahnjs generator to get a workable structure.

```

```

## Example of autobahnjs "app" and expressjs skeleton

```javascript
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
```

### Example of retsful map
```javascript
var deep = require("deepjs/deep");
require("deep-mongo");
module.exports = {
	"/user": deep.ocm({
		admin: deep.Mongo(null, "mongodb://127.0.0.1:27017/testdb", "user"),
		user: {
			backgrounds: ["this::../admin", deep.Disallow("del", "flush")]
		},
		"public": {
			backgrounds: ["this::../user", deep.AllowOnly("get")]
		}
	}, {
		protocol: "user",
		sensibleTo: "roles"
	}),
	"/foo":deep.Collection("foo", [{ id:"e1", bar:true, zoo:"hello world" }])
};
```

### Example of html map
```javascript
var deep = require("deepjs");
require("deep-views/lib/view");
require("deep-node/lib/rest/file/json")({ // create json client that look from /www. use it under "json" protocol.
	protocol: "json",
	basePath: "/www"
});
require("deep-swig/lib/nodejs")({ // create swigjs client that look from /www. use it under "swig" protocol.
	protocol: "swig",
	basePath: "/www"
});
// map for html pages produced by server. the map itself, or the entries of the map, could be OCM.
// example of map :
module.exports = {
	head:deep.View({
		how:"<title>html from server</title>",
		where:"dom.appendTo::head"
	}),
	body:deep.View({
		subs:{
			topbar:deep.View({
				how:"<div>topbar</div>",
				where:"dom.htmlOf::#topbar"
			}),
			content:deep.View({
				route:"/$",
				how:"<div>default content</div>",
				where:"dom.htmlOf::#content"
			}),
			hello:deep.View({
				route:"/hello/?s:name",
				how:"<div>hello { name+'!' | 'dude!'}</div>",
				where:"dom.htmlOf::#content"
			})
		}
	}),
	index:deep.View({
		how:"swig::/index.html",	// load index from www
		where:"dom.appendTo::"		// NO Selector says : use html merge rules (see deep-jquery)
	})
};
```

### Example of statics map
```javascript
var deep = require("deepjs/deep");
// map for static files served by server (the map itself could be OCM)
module.exports = {
	"/": [{ // serve root
		path: deep.globals.rootPath + '/www',
		options: {	// native expressjs connect-statics options
			maxAge: 86400000,
			redirect: false
		}
	}]
};
```

## Usage from outside.
 
Outside means from you prefered http client (maybe your browser) to the server.
If you use previous map in your autobahnjs/express skeleton (as above) : 

Open your browser and try by example :
`http://127.0.0.1:3000/`
`http://127.0.0.1:3000/hello`
`http://127.0.0.1:3000/hello/jhonny`
`http://127.0.0.1:3000/foo`
`http://127.0.0.1:3000/foo/e1`
`http://127.0.0.1:3000/foo/?bar`
...

And with your prefered restful client, you should try to post/put/patch/Del/get/range/... to /foo service.

## Usage from "inside"

Inside means from nodejs CLI or from any script executed server side.

* deep.App(appObj) : holds appObj as main app accessible through chains.
* deep.login({ email:"john@doe.com", password:"test123"}) : start a contextualised chain, create session, retrieve user, etc. exactly as if you had really logged in from outside (i.e. through http client)
* .login(...) : from anywhere in a chain, do the same thing than deep.login
* deep.impersonate({ id:"..." }) : start a contextualised chain, rerieve user an do login without password.
* .impersonate(...) : from anywhere in a chain, do the same than deep.impersonate
* .logout() : : from anywhere in a chain, break current session
	
example :

```javascript
deep.App(appObj);
//...
deep.login({ email:"john@doe.com", password:"..." }) // endoss localy user identity (context, session, modes, ...)
.restful("myCollection") // take "myCollection" restful collection
.put({ /*...*/ })		// put something in it as john doe.
.logout()				// break current chain session
.impersonate({ id:"some_user_id" }) // endoss localy other user identity
.restful("someCollection") 			// ...
.get("?email=ced@doe.com")
.done(function(s){ /*...*/ })
.fail(/*...*/);
```


## Manage multiple app (advanced)

Imagine that you produce different expressjs skeleton/autobhan js app in the same nodejs process.

You should want to switch from one to another and/or execute each in its own context.
For that you have two method that encapsulate the provided app in chain context.

	* deep.app(appObj) : start a contextualised chain that hold appObj in its context. (advanced) 
	* .app(appObj) : from anywhere in a chain, hold appObj in its context. (advanced)
