/**
 * Middleware for HTTP sessions. Requests will have a getSession(createIfNecessary, expires)
 * (both arguments optional) method for accessing the session.
 * Sessions can also be statically accessed with the exported getCurrentSession function.
 * Session middleware can be started with any object store, and defaults to a
 * Perstore provided session store.
 */

if(typeof define !== 'function'){
	var define = require('amdefine')(module);
}

define(function (require){
	//var promiseModule = require("promised-io/promise"),
		var settings = require("perstore/util/settings"),
		sha1 = require("pintura/util/sha1").hex_sha1;
	var Memory = require("autobahn/stores/memory").store;
	var AutobahnResponse = require("autobahn/autobahn-response");
	var deep = require("deep/deep");
	//var when = require("deep/promise").when;
	var Session = {

	};
	Session.jsgi = function(store, options, nextApp)
	{
		if(!store)
			store = new Memory();
		Session.store = store;
		options = options || {};
		Session.expires = options.expires || settings.sessionTTL || 300;
		Session.expiresDeltaMS = Session.expires*1000;
		//
		//console.log("Session.jsgi : ", store)
		return function(request){




			var session = null;
			// try to fetch the stored session
			var cookieId, cookie = request.headers.cookie;
			cookieId = cookie && cookie.match(/autobahn-session=([^;]+)/);
			cookieId = cookieId && cookieId[1];
			if (cookieId) 
			{
				if (cookieId === cookieVerification(request)) 
					// allow for cookie-based CSRF verification
					delete request.crossSiteForgeable;
				session = store.get(cookieId);
			}
			var context = deep.context;
			if(!context)
				context = deep.context = request.context = {};
			context.request = request;

			request.autobahn = request.autobahn || {};
			// wait for promised session
			return deep.when(session).then(function(session){
				// make session available as request.autobahn.session
				if(session)
				{
					var timeout = null;
					if(session.expires) 
						timeout = new Date() > new Date(session.expires);
					if(timeout != null)
					{
						store.delete(cookieId);
						request.autobahn.session = null;
						return new AutobahnResponse(403,{}," session timeout : please login! ");
					}
					else
						request.autobahn.session = session;	
				}
				else
					request.autobahn.session = null;
				if(request.url == "/logout/")
				{	
					console.log("LOG OUT !!!!!")
					if(session)
						session.del();
					return new AutobahnResponse(200,{"set-cookie":"autobahn-session=null;path=/;expires=0"},{msg:"logged out!", error:null})
				}
				console.log("session will call next app")
				// process the request
				return deep.when(nextApp(request)).then(function(response){
					// store session cookie
					//console.log("session next app result : ", response)
					if(request.autobahn.session) /// refresh cookies and session expiration
					{	
						var expires = null; //new Date().valueOf()+Session.expiresDeltaMS;
						Session.setSessionCookie(response, request.autobahn.session.id, expires);
						request.autobahn.session.expires = null;//new Date(expires)
						// save session
						return deep.when(store.put(request.autobahn.session )).then(function(){
							return response;
						});
					}
					return response;
				});
			});
		};
	};
	function checkTimeout(id, expires){
		var till = (expires.valueOf() - new Date().valueOf()) + 5000;
		if(till > 0)
			setTimeout(function(){
				deep.when(Session.store.get(id)).then(function(session){
					if(!session)
						return;
					var exp = new Date(session.expires);
					if(new Date() >= exp)
						Session.store["delete"](id);
					else
						checkTimeout(id, exp);
				})
			}, till);
		else
			deep.when(Session.store.get(id)).then(function(session){
				if(session)
					Session.store["delete"](id);
			})
	}

	// gets a session, creating a new one if necessary
	function forceSession(request, expires){
		request.autobahn = request.autobahn || {};
		var session = request.autobahn.session;
		if(session)
			return session;
		
		var newSessionId = generateSessionKey();
		if (typeof expires === 'undefined' && expires !== 0) 
			expires = - Session.expires;
		if (expires < 0)
			expires = ((new Date()).valueOf())-expires*1000;
		var expiration = new Date(expires);

		// TODO: use add()
		session = request.autobahn.session = {
			expires: null,//new Date(expiration).toISOString(),
			id: newSessionId,
			save:function(){
				return Session.store.put(session);
			},
			del:function(){
				return Session.store["delete"](session.id);
			}
		}; 
		//console.log("forceSesison : ", session)
		if(session.expires != null)
			checkTimeout(session.id, expiration);
		return deep.when(Session.store.put(session)).then(function(){
			return session;
		});
	};

	Session.getCurrentSession = function (createIfNecessary, expiration)
	{
		expiration = 0;
		var request = deep.context && deep.context.request;
		request.autobahn = request.autobahn || {};
		if(request){
			if(request.autobahn.session){
				return request.autobahn.session;
			}
			if(createIfNecessary){
				expiration = (typeof expiration !== 'undefined')?expiration:(new Date().valueOf()+Session.expiresDeltaMS);
				return forceSession(request, expiration);
			}
		}
		return null;
	}

	function cookieVerification(request){
		var pinturaAuth = request.queryString.match(/autobahn-session=(\w+)/);
		if(pinturaAuth){
			request.queryString = request.queryString.replace(/autobahn-session=\w+/,'');
			return pinturaAuth[1];
		}
	}
	Session.setSessionCookie = function (response, sessionId, expires){
		if (!response.headers) response.headers = {};
		expires = null;
		response.headers["set-cookie"] = "autobahn-session=" + sessionId + ";" + (settings.security.httpOnlyCookies ? "HttpOnly;" : "") + "path=/" + (expires ? ";expires=" + new Date(expires).toUTCString() : "");
	}
	Session.killSessionCookie = function (response, sessionId, expires){
		if (!response.headers) response.headers = {};
		expires = null;
		response.headers["set-cookie"] = "autobahn-session=null;path=/;expires=0";
	}
	function generateSessionKey(username, password){
		return sha1(rnd()+rnd()+rnd()) + sha1(rnd()+rnd()+rnd());
	};
	function rnd(){
		return Math.random().toString().substring(4);
	}
	return Session;
});
