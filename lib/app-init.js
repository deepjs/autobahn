/**
 * @author Gilles Coomans
 *
 * Experimental : contruct automatically the expressjs skeleton based on configuration object.
 * Take a look to Docs/example-index.js before. 
 * Here are just facilities that try to do the same automatically.
 * Should be re-tested after bunch of refactoring and modification.
 */

var cookieParser = require('cookie-parser');
var session = require('express-session');
var bodyParser = require('body-parser');

var autobahn = require("../index");

/* Example config : (deprecated)
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
        sessionModes:function(session){
            if(session && session.user)
                return { roles:"user" };
            return { roles:"public" };
        },
        protocols:{
            
        }
    }


 */



/**
 * Initialise an "autobahnjs app". 
 * i.e. construct related expressjs middelwares routing with provided options.
 */
module.exports = {
    init: function(config) {
        config = config || {};
        var app = express();
        config.express = app;

        if (typeof config.services === 'string')
            config.services = require(config.services);
        if (typeof config.htmls === 'string')
            config.htmls = require(config.htmls);
        if (typeof config.statics === 'string')
            config.statics = require(config.statics);

        config.sessionModes = config.sessionModes || this.sessionModes;
        app.use(cookieParser());
        if (config.session)
            app.use(session(config.session));
        app.use(bodyParser({ strict:false }))
            .use(this.context.middleware(config.contextInit))
            .use(this.modes.middleware(config.sessionModes));
        if (config.protocols)
            app.use(this.protocols.middleware(config.protocols));

        if (config.user) {
            if (!config.session)
                throw deep.errors.Error(500, "autobahn init failed : you need session to manage users");
            // set simple session management (pure expressjs)
            config.loggedIn = config.user.loggedIn || null;

            // to get body parsed automatically (json/files/..)

            // ------ USER LOGIN/LOGOUT/ROLES MANAGEMENT
            app.post("/logout", this.logout.middleware()); // use this middleware to logout : you just need to post anything on it.

            config.user.login = config.user.login || {};
            config.user.login.store = config.user.login.store || config.user.store || 'user';
            config.user.login.encryption = config.user.login.encryption || config.user.encryption || 'sha1';
            config.user.login.loginField = config.user.login.loginField || 'email';
            config.user.login.passwordField = config.user.login.passwordField || 'password';
            config.user.login.loggedIn = config.user.loggedIn || null;

            if (!config.loginHandlers)
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

        if (config.modules) {
            config.services = config.services ||  {};
            config.htmls = config.htmls ||  {};
            config.statics = config.statics ||  {};
            config.modules.forEach(function(module) {
                require(module)(config.services, config.htmls, config.statics);
            });
        }
        ///____________________________________________________  USE YOUR MAPS

        if (config.services)
            app.use(this.restful.map(config.services));
        if (config.statics)
            app.use(this.statics.middleware(config.statics));
        if (config.htmls)
            app.use(this.html.map(config.htmls));
        ///____________________________________________________      Finish app construction
        app///.use(app.router)
            .use((config.errors && config.errors.NotFound) ? config.errors.NotFound : function(req, res, next) {
                console.log("nothing to do with : ", req.url);
                res.writeHead(404, {
                    'Content-Type': 'text/html'
                });
                res.end("error : 404");
            })
            .listen(config.port || 3000);

        deep.App(config);
        return config;
    },
    // default session modes handler
    sessionModes: function(session) {
        if (session && session.user) {
            if (session.user.roles)
                return { roles: session.user.roles };
            return { roles: "user" };
        }
        return { roles: "public" };
    },
    context: require("./middleware/context"),
    html: require("./middleware/html"),
    language: require("./middleware/language"),
    login: require("./middleware/login"),
    logout: require("./middleware/logout"),
    restful: require("./middleware/restful"),
    modes: require("./middleware/modes"),
    statics: require("./middleware/statics"),
    protocols: require("./middleware/protocols"),
    register: null,
    changePassword: null
};
