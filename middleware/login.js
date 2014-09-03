/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
var deep = require('deepjs');

//var urlparse = require('url').parse;
var crypto = require('crypto');

exports.createHandlers = function(config) {
    return {
        login: function(object, session) {

            if (!object)
                return deep.errors.Error(400);

            var loginVal = object[config.loginField || "email"];
            var password = object[config.passwordField || "password"];
            //
            //console.log("LOGIN HANLDER : ", object, session);
            if (!loginVal || !loginVal)
                return deep.errors.Error(400);

            password = deep.utils.Hash(password, config.encryption || 'sha1');

            return deep
                .roles("admin")
                .restful(config.store || 'user')
                .get("?" + (config.loginField || "email") + "=" + encodeURIComponent(loginVal) + "&password=" + password)
                .done(function(user) {
                    //console.log("************ login get : ", user, session, config.loggedIn);
                    if (user.length === 0)
                        return deep.errors.NotFound();
                    user = user.shift();

                    if (user.valid === false)
                        return deep.errors.Unauthorized('Account is not active.');

                    delete user.password;
                    session.user = user;
                    if (config.loggedIn)
                        return deep.when(config.loggedIn(session))
                            .done(function(session) {
                                return session;
                            });
                    return session;
                });
        },
        impersonate: function(object, session) {
            if (!object)
                return deep.errors.Error(400);
            var keys = Object.keys(object);
            var toCatch = keys.shift();
            var query = "?" + toCatch + "=" + encodeURIComponent(object[toCatch]);

            return deep.roles("admin")
            	.restful(config.store || 'user')
                .get(query)
                .done(function(user) {
                    //console.log("login get : ", user);
                    if (user.length === 0)
                        return deep.errors.NotFound();
                    user = user.shift();
                    delete user.password;
                    session.user = user;
                    if (config.loggedIn)
                        return deep.when(config.loggedIn(session))
                            .done(function(session) {
                                return session;
                            });
                    return session;
                });
        }
    };
};

exports.middleware = function(handlers) {
    return function(req, response, next) {
        if (!req.body)
            return deep.errors.Error(400);
        var handler = handlers.login;
        deep.when(handler(req.body, req.session))
        .done(function(session) {
            req.session = session;
            response.writeHead(200, {
                'Content-Type': 'application/json'
            });
            response.end(JSON.stringify(session.user));
        })
        .fail(function(e) {
            response.writeHead(400, {
                'Content-Type': 'text/html'
            });
            response.end("error.");
        });
    };
};

exports.impersonate = function(handlers) {
    return function(req, response, next) {
        if (!req.body)
            return deep.errors.Error(400);
        var handler = handlers.impersonate;
        deep.when(handler(req.body, req.session))
            .done(function(session) {
                req.session = session;
                response.writeHead(200, {
                    'Content-Type': 'application/json'
                });
                response.end(JSON.stringify(session.user));
            })
            .fail(function(e) {
                response.writeHead(400, {
                    'Content-Type': 'text/html'
                });
                response.end("error.");
            });
    };
};