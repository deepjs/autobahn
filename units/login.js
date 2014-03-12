'use strict';
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(['require', 'deepjs', 'autobahnjs'], function(require, deep, autobahn) {

    //_______________________________________________________________ GENERIC STORE TEST CASES
    var unit = {
        title: 'autobahnjs/units/login',
        stopOnError: false,
        setup: function() {
            var loggedIn = function(session) {
                //console.log('testcase : loggedIn : ', session)
                session.decorated = true;
                return session;
            };
            return {
                protocols: deep.ocm({
                    'public': {
                        test: function(path) {
                            return 'hello : public : ' + path;
                        }
                    },
                    user: {
                        test: function(path) {
                            return 'hello : user : ' + path;
                        }
                    }
                }, {
                    group: 'roles'
                }),
                loggedIn: loggedIn,
                getModes: function(session) {
                    //console.log('testcase : getModes : ', session)
                    if (session && session.user)
                        return {
                            roles: 'user'
                        };
                    return {
                        roles: 'public'
                    };
                },
                loginHandlers: autobahn.login.createHandlers({
                    encryption: 'sha1',
                    store: deep.store.Collection.create(null, [{
                        id: 'u1',
                        email: 'toto@bloup.com',
                        password: deep.utils.Hash('test', 'sha1')
                    }, {
                        id: 'u2',
                        email: 'toti@bloup.com',
                        password: deep.utils.Hash('test', 'sha1')
                    }]),
                    loginField: 'email',
                    passwordField: 'password',
                    loggedIn: loggedIn
                })
            };
        },
        tests: {
            login: function() {
                return deep.app(this)
                    .roles('public')
                    .login({
                        email: 'toto@bloup.com',
                        password: 'test'
                    })
                    .equal({
                        user: {
                            id: 'u1',
                            email: 'toto@bloup.com'
                        },
                        decorated: true
                    })
                    .done(function() {
                        return deep.context.modes.roles;
                    })
                    .equal('user');
            },
            session: function() {
                return deep.app(this)
                    .roles('public')
                    .session({
                        user: {
                            id: 'u1',
                            email: 'toto@bloup.com'
                        }
                    })
                    .done(function() {
                        return deep.context.session;
                    })
                    .equal({
                        user: {
                            id: 'u1',
                            email: 'toto@bloup.com'
                        },
                        decorated: true
                    })
                    .done(function() {
                        return deep.context.modes.roles;
                    })
                    .equal('user');
            },
            impersonate_id: function() {
                return deep.app(this)
                    .roles('public')
                    .impersonate({
                        id: 'u1'
                    })
                    .done(function() {
                        return deep.context.session;
                    })
                    .equal({
                        parent: {},
                        user: {
                            id: 'u1',
                            email: 'toto@bloup.com'
                        },
                        decorated: true
                    })
                    .done(function() {
                        return deep.context.modes.roles;
                    })
                    .equal('user');
            },
            impersonate_email: function() {
                return deep.app(this)
                    .roles('public')
                    .impersonate({
                        email: 'toto@bloup.com'
                    })
                    .done(function() {
                        return deep.context.session;
                    })
                    .equal({
                        parent: {},
                        user: {
                            id: 'u1',
                            email: 'toto@bloup.com'
                        },
                        decorated: true
                    })
                    .done(function() {
                        return deep.context.modes.roles;
                    })
                    .equal('user');
            },
            login_logout: function() {
                return deep.app(this)
                    .roles('public')
                    .login({
                        email: 'toto@bloup.com',
                        password: 'test'
                    })
                    .done(function() {
                        return deep.context.modes.roles;
                    })
                    .equal('user')
                    .logout()
                    .done(function() {
                        return deep.context.modes.roles;
                    })
                    .equal('public');
            },
            impersonate_logout: function() {
                return deep.app(this)
                    .roles('public')
                    .impersonate({
                        email: 'toto@bloup.com'
                    })
                    .done(function() {
                        return deep.context.modes.roles;
                    })
                    .equal('user')
                    .logout()
                    .done(function() {
                        return deep.context.modes.roles;
                    })
                    .equal('public');
            },
            login_impersonate_logout: function() {
                return deep.app(this)
                    .roles('public')
                    .login({
                        email: 'toto@bloup.com',
                        password: 'test'
                    })
                    .impersonate({
                        email: 'toti@bloup.com'
                    })
                    .done(function() {
                        return deep.context.modes.roles;
                    })
                    .equal('user')
                    .logout()
                    .done(function() {
                        return deep.context.modes.roles;
                    })
                    .equal('user')
                    .logout()
                    .done(function() {
                        return deep.context.modes.roles;
                    })
                    .equal('public')
            },
            protocols_public: function() {
                return deep.app(this)
                    .roles('public')
                    .deep('test::local')
                    .equal('hello : public : local');
            },
            protocols_user: function() {
                return deep.app(this)
                    .roles('user')
                    .deep('test::local')
                    .equal('hello : user : local');
            },
            protocols_login_user: function() {
                return deep.app(this)
                    .roles('public')
                    .login({
                        email: 'toto@bloup.com',
                        password: 'test'
                    })
                    .deep('test::local')
                    .equal('hello : user : local')
                    .logout()
                    .deep('test::local')
                    .equal('hello : public : local');
            }
        }
    };

    return unit;
});