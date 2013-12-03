# usage

var express = require('express');

var context = require("autobahn/middleware/context"),
	roles = require("autobahn/middleware/roles"),
	login = require("autobahn/middleware/roles"),
	restful = require("autobahn/middleware/roles");

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
		}, { group:"roles" })
	};


	var MongoStore = require('connect-mongo')(express);
	var conf = {
		db: {
			db: 'sessions',
			host: '127.0.0.1',
			//port: 6646,  // optional, default: 27017
			//username: 'admin', // optional
			//password: 'secret', // optional
			collection: 'sessions' // optional, default: sessions
		},
		secret: 'paezijp7YlhgiGOUYgtogz'
	};

	var app = express();
	app.use(express.cookieParser());
	app.use(express.session({
		secret: conf.secret,
		maxAge: new Date(Date.now() + 3600000),
		store: new MongoStore(conf.db)
	}));

	app.use(express.bodyParser());
	app.post("/login", login.middleware("user", "email", function(user){

	}));

	app
	.use(restful.map(services))
	.use(function(req, res, next){
		res.writeHead(404, {'Content-Type': 'text/html'});
		res.end("error : 404");
	})
	.listen(config.port || 3000);

	console.log("server listening on port : ", config.port || 3000);
