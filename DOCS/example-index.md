require("deepjs")
deep.globals.rootPath = __dirname+"/";
var autobahn = require("autobahnjs");
require("deep-node/lib/stores/fs/json").createDefault(); // allow to load or post/put/patch/del json files with deep("json::/path/from/root/file.json").log() or deep.store("json").post({ aProp:true }, { id:"/path/from/root/output.json"}).log()
require("deep-swig").createDefault(); // allow to load swigjs template files with deep("swig::/path/from/root/file.html").log()


//__________________________________ exposed services ____________________________________________

var services = {
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


//__________________________________ exposed htmls routes ____________________________________________
var htmls = {
	"/":{
		page:"swig::./www/index.swig",
		context:{
		}
	}
};
//__________________________________ exposed statics files and folder ________________________________

var statics = {
	"/":[ { path:__dirname + '/www', options:{ maxAge: 86400000, redirect:false } } ],
	"/libs/deepjs":[ { path:__dirname + '/node_modules/deepjs', options : { maxAge: 86400000, redirect:false } } ],
	"/libs/deep-swig":[ { path:__dirname + '/node_modules/deep-swig', options : { maxAge: 86400000, redirect:false } } ],
	"/libs/deep-routes":[ { path:__dirname + '/node_modules/deep-routes', options : { maxAge: 86400000, redirect:false } } ],
	"/libs/rql":[ { path:__dirname + '/node_modules/rql', options : { maxAge: 86400000, redirect:false } } ]
};

//______________________________________________________________________________

deep.store.Mongo.create("user", "mongodb://127.0.0.1:27017/my_db", "user"); // user store
var MongoStore = require('connect-mongo')(express);							// session store
var confSessionStore = {
	db: {
		db: 'sessions',
		host: '127.0.0.1',
		//port: 6646,  // optional, default: 27017
		//username: 'admin', // optional
		//password: 'secret', // optional
		collection: 'sessions' // optional, default: sessions
	},
	secret: '82YBkLU_DG09bIUYiLDH6_23KZDJN92I4'
};


var config = {
	port:3000,
	services:services,
	htmls:htmls,
	statics:statics,
	modules:[],
	routerParser:'deep', // or express
	user:{
		store:"user",
		encryption:"sha1",
		session:{
			secret: conf.secret,
			maxAge: new Date(Date.now() + 3600000),
			store: new MongoStore(conf.db)
		},
		getRoles:function(session){
			if(session && session.passport)
				return session.passport.roles;
			return "public";
		},
		loggedIn:function(session){
				// session has been decorated with user's object.
				// do asynch stuffs to get passport etc
			return session;
		},
		login:{
			loginField:"email",
			passwordField:"password",
			schema:{},
			allowImpersonation:["admin"],
			
		}/*,
		register:{
			redirection:"/#/register/confirmation",
			email:{
				template:"swig::/templates/...",
				reply:"info@brol.com"
			}
		},
		changePassword:{
			redirection:"/#/change-password/confirmation",
			email:{
				//...
			}
		}*/
	}
};


var app = autobahn.init(config);

console.log("server listening on port : ", config.port);

var  repl = require("repl");
repl.start({
	prompt: "node via stdin> ",
	input: process.stdin,
	output: process.stdout
});








