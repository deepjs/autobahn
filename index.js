/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * autobahnjs main file. load app, login/logout/impersonate and all middlewares.
 */
var deep = require("deepjs"),
    app = require("./lib/app"),
    utils = require("./lib/utils"),
    crypto = require("crypto");

require("deep-restful/lib/collection"); // could be util
require("deep-restful/lib/chain"); // deepjs homogeneous restful chain API

deep.coreUnits = deep.coreUnits || [];
deep.coreUnits.push(
    "js::autobahnjs/units/login"
);

module.exports = {
    app:function(config, expressApp){
        var app = deep.utils.copy(config);
        app.express = expressApp;
        var handler = this.login.createHandlers(config);
        deep.up(app, handler);
        return app;
    },
    /* Middlewares */
    context: require("./lib/middleware/context"),
    html: require("./lib/middleware/html"),
    language: require("./lib/middleware/language"),
    login: require("./lib/middleware/login"),
    logout: require("./lib/middleware/logout"),
    restful: require("./lib/middleware/restful"),
    modes: require("./lib/middleware/modes"),
    statics: require("./lib/middleware/statics"),
    protocols: require("./lib/middleware/protocols")
};