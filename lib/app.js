/**
 * @author Gilles Coomans
 *
 * Autobahnjs "app" definition.
 * And Login/Logout/Impersonate deepjs/chain handlers (based on app).
 *
 * An "app" is just a really simple object that essentially holds 
 * your custom handlers and config datas to perform user/session/context/modes management. 
 *
 * See Docs/example-index.js for workable example. 
 * See also units/login.js for workable login/logout/impersonate examples. 
 */
var deep = require("deepjs");

var closure = {
    app: null
};

// holds provided app as main app accessible for deepjs chains.
deep.App = function(app) {
    if (app)
        closure.app = app;
    return deep(app).app(app);
};

// Start a deepjs chain with provided app in its own context. does not modifiy global app.
deep.app = function(app) {
    //console.log("deep.app : context : ", deep.context);
    return deep(app || deep.Promise.context.app || closure.app).app(app || deep.Promise.context.app || closure.app)
};

// define current app from within a chain (use current chain's context)
deep.Promise.API.app = function(app) {
    var self = this;
    var func = function(s, e) {
        app = app || deep.Promise.context.app || closure.app;
        if (!app)
            return deep.errors.Error(500, "No app provided on deep.Chain.app(...)");
        deep.Promise.context = self._context = deep.utils.shallowCopy(self._context);
        self._context.session = self._context.session || {};
        self._context.protocols = app.protocols;
        self._context.app = app;
        //console.log("promise.Chain.app : ", self._context);
        return s;
    };
    func._isDone_ = true;
    return this._enqueue(func);
}


//_________________________
/**
 * start a chain with provided session. session is placed in chain's context.
 * @param  {[type]} session [description]
 * @return {[type]}         [description]
 */
deep.session = function(session) {
    if (!session)
        return deep.Promise.context.session;
    return deep({}).session(session);
};

// change session fom within a chain (placed in own context)
deep.Chain.add("session", function(session) {
    var self = this;
    var func = function(s, e) {
        var app = deep.Promise.context.app || closure.app;
        if (!app)
            return deep.errors.Error(500, "No app setted in deep to manipulate session.");
        deep.Promise.context = self._context = deep.utils.shallowCopy(self._context);
        if (typeof session === 'function')
            self._context.session = session();
        else
            self._context.session = session;
        self._context.protocols = app.protocols;
        if (session.user && app.loggedIn)
            return deep.when(app.loggedIn(session))
                .done(app.sessionModes)
                .done(function(modes) {
                    self.modes(modes);
                    return s;
                });
        self.modes(app.sessionModes(session));
        return s;
    };
    func._isDone_ = true;
    return this._enqueue(func);
});
//_________________________

/**
 * login : means create a chain that hold a context that mimics a full login from outside
 * (credentials will be validate as trough real login, and session (in chain context) will be decorated with same methods)
 * The roles of the chain is automatically set to the one from user
 * @param  {[type]} obj [description]
 * @return {[type]}     [description]
 */
deep.login = function(obj) {
    return deep({}).login(obj);
};

// apply login from within a chain. (resulting session is placed in chain's context)
deep.Chain.add("login", function(datas) {
    var self = this;
    var func = function(s, e) {
        var app = deep.Promise.context.app || closure.app;
        if (!app)
            return deep.errors.Error(500, "No app setted in deep to manipulate session.");
        deep.Promise.context = self._context = deep.utils.shallowCopy(self._context);
        self._context.session = {};
        self._context.protocols = app.protocols;
        return deep.when(app.loginHandlers.login(datas, self._context.session))
            .done(function(session) {
                self.modes(app.sessionModes(session));
                return session;
            });
    };
    func._isDone_ = true;
    return this._enqueue(func);
});
//_________________________
/**
 * logout : means  : if you have previously use deep.login or chain.login : it will destroy the session of current chain context.
 * @return {[type]} [description]
 */
deep.Chain.add("logout", function() {
    var self = this;
    var func = function(s, e) {
        var app = deep.Promise.context.app || closure.app;
        if (!app)
            return deep.errors.Error(500, "No app setted in deep to manipulate session.");
        if (self._context.session) {
            if (self._context.session.parent)
                self._context.session = self._context.session.parent;
            else
                self._context.session = {};
        }
        self.modes(app.sessionModes(self._context.session));
        return s;
    };
    func._isDone_ = true;
    return this._enqueue(func);
});

//_________________________
/**
 * Impersonate means : (always in local chains context)
 * mimics and allow a login with only a user ID.
 * @param  {[type]} user [description]
 * @return {[type]}      [description]
 */
deep.impersonate = function(user) {
    return deep({}).impersonate(user);
};

// apply impersonation from within a chain. resulting session is placed in current chain's context.
deep.Chain.add("impersonate", function(user) {
    var self = this;
    var func = function(s, e) {
        var app = deep.Promise.context.app || closure.app;
        if (!app)
            return deep.errors.Error(500, "No app setted in deep to manipulate session for impersonation.");
        deep.Promise.context = self._context = deep.utils.shallowCopy(self._context);
        //console.log("login : session 2 : ", self._context.session)
        var oldSession = self._context.session = self._context.session || {};
        var session = self._context.session = {};
        session.parent = oldSession.parent || oldSession;
        self._context.protocols = app.protocols;
        return deep.when(app.loginHandlers.impersonate(user, self._context.session))
            .done(function(session) {
                self.modes(app.sessionModes(session));
                return s;
            });
    };
    func._isDone_ = true;
    return this._enqueue(func);
});

