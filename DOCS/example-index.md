
## example

```javascript
var express = require('express');
var deep = require("deepjs");
deep.globals.rootPath = __dirname+"/";
require("deep-node-fs/json").createDefault();
require("deep-swig").createDefault();
require("deep-mongo");
var autobahn = require("autobahn");

//______________________________________________________________________________

var services = {								// exposed services
	"/test/:id?":deep.ocm({
		"public":{
			get:function(id, options){
				return "public test : "+id;
			}
		},
		"user":{
			get:function(id, options){
				return "user test : "+id;
			}
		}
	}, { group:"roles", protocol:"test" })
};


var htmls = {
	"/":{
		page:"swig::./www/index.swig",
		context:{
			mainPath:"/main"
		}
	}
};

var statics = {
	"/":[ { path:__dirname + '/www', options:{ maxAge: 86400000, redirect:false } } ],
	"/libs/deepjs":[ { path:__dirname + '/node_modules/deepjs', options : { maxAge: 86400000, redirect:false } } ],
	"/libs/deep-swig":[ { path:__dirname + '/node_modules/deep-swig', options : { maxAge: 86400000, redirect:false } } ],
	"/libs/rql":[ { path:__dirname + '/node_modules/rql', options : { maxAge: 86400000, redirect:false } } ]
};

//______________________________________________________________________________

deep.store.Mongo.create("user", "mongodb://127.0.0.1:27017/my_db", "user"); // user store
var MongoStore = require('connect-mongo')(express);									// session store
var conf = {
	db: {
		db: 'sessions',
		host: '127.0.0.1',
		//port: 6646,  // optional, default: 27017
		//username: 'admin', // optional
		//password: 'secret', // optional
		collection: 'sessions' // optional, default: sessions
	},
	secret: 'my_secret'
};

var app = express();

app
.use(express.cookieParser())
.use(express.session({
	secret: conf.secret,
	maxAge: new Date(Date.now() + 3600000),
	store: new MongoStore(conf.db)
}))
.use(function(req, res, next){
	deep.setModes({ roles:"public" });
	next();
})
.use(express.bodyParser())
.use(app.router)
.use(autobahn.context.middleware())
.post("/logout", autobahn.logout.middleware())
.post("/login", autobahn.login.middleware("user", "email"))
.use(autobahn.roles.middleware(function(session)
{
	if(session && session.user)
		return ["user"];
	return ["public"];
}));

///____________________________________________________

autobahn.statics.map(statics, app);

app
.use(autobahn.html.simpleMap(htmls))
.use(autobahn.restful.map(services));

///_________________________________________________

app.use(function(req, res, next){
	console.log("nothing to do with : ", req.url);
	res.writeHead(404, {'Content-Type': 'text/html'});
	res.end("error : 404");
})
.listen(3000);

console.log("server listening on port : ", 3000);

var  repl = require("repl");
repl.start({
	prompt: "node via stdin> ",
	input: process.stdin,
	output: process.stdout
});



```


