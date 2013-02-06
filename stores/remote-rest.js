/**
 * A remote client store that uses JSGI to retrieve data from remote sources
 */
 
if(typeof define !== 'function'){
	var define = require('amdefine')(module);
}
define(function(require){
var JSONExt = require("perstore/util/json-ext");
var request = require("promised-io/http-client").request;
var deep = require("deep/deep");
var DatabaseError = require("perstore/errors").DatabaseError,
	AccessError = require("perstore/errors").AccessError,
	MethodNotAllowedError = require("perstore/errors").MethodNotAllowedError;
var autobahnController = require("autobahn/autobahn-controller");
var Session = require("autobahn/session");
var erros = require("autobahn/errors");
//var Session = require("pintura/jsgi/session");

var Remote = function (argument) {
	// body...
}
Remote.prototype.setRemoteHeaders = function (options, headers) {
	if(options.session)
		headers["Session-ID"] = options.session.id;
	if(options.referer)
		headers["referer"] = options.referer;
	if(options["accept-language"])
		headers["accept-language"] = options["accept-language"];

}
Remote.prototype = {
		dummies:null,
		remoteURL:null,
		get: function(id, options){
			try{
				//construct of the url
				var url = (this.remoteURL[this.remoteURL.length-1]=="/")?(this.remoteURL+id):(this.remoteURL+"/"+id);
				/*if(console && console.flags && console.flags["remote-rest"])
					console.log("Remote-rest : get : ", url);//
				*/
				//set the headers
				var headers = {};
				
				var session = Session.getCurrentSession(false);
				if(session && session.remoteUser)
					headers["Session-ID"] = session.id;
				
				this.setRemoteHeaders(options, headers);
				
				return deep.when(request({
					method:"GET",
					url:url,
					//queryString: query,
					headers: headers
				}))
				.done( function  (success) {
					createParser("GET");
				})
				.fail(function (error) {
					console.log("error (remote HTTP call failed) while calling remote-services : get::"+this.remoteURL+ " - ", error);
					return error;
				});

			}catch(error){
				console.log("error (throw) while calling remote-store : get::"+this.remoteURL+ " - ", error);
				throw error;
			}
		},
		put: function(object, options){
			try{
				//console.log("Remote put : ", id);
				if(!options.id)
					throw new AccessError("Store need id on put");

				var id = object.id || options.id;

				var finalURL = (this.remoteURL[this.remoteURL.length-1]=="/")?(this.remoteURL+id):(this.remoteURL+"/"+id);

				var headers =  {};
				
				var session = Session.getCurrentSession(false);
				if(session && session.remoteUser)
					headers["Session-ID"] = session.id;

				this.setRemoteHeaders(options, headers);

				var responsePromise= 
					request({
						method: "PUT",
						url:finalURL,
						//pathInfo: '/' + id,
						body: JSONExt.stringify(object),
						headers: headers
					});

				return deep.when(responsePromise)
					.done( function (success) {
						createParser("PUT")
					}).fail( function  (error) {
						console.log("error (remote HTTP call failed) while calling remote-services : put::"+finalURL+ " - ", error);
						return error
					});
			}catch(error){
				console.log("error (throw) while calling remote-store : put::"+finalURL+ " - ", error);
				throw error;
			}
		},
		post: function(object, options){

			try{
				//if(console && console.flags && console.flags["remote-rest"])
					console.log("REMOTE STORE : post : ", object, " - on  ", this.remoteURL, " - accepted language : ",options["accept-language"])

				var headers = {};

				var session = Session.getCurrentSession(false);
				if(session && session.remoteUser)
					headers["Session-ID"] = session.id;

				this.setRemoteHeaders(options, headers);

				//console.log("HEADER  : ", headers )
				var responsePromise= 
					request({
						method: "POST",
						url:this.remoteURL, // + '/',
						//pathInfo: this.remoteURL,

						body: JSONExt.stringify(object),
						headers: headers
					});
				
				return deep.when(responsePromise)
					.done(function (success) {
						createParser("POST")
					})
					.fail( function  (error) {
						console.log("error (remote HTTP call failed) while calling remote-services : post::"+this.remoteURL+ " - ", error);
						return error;
					});
			}catch(error){
				console.log("error (throw) while calling remote-store : post::"+this.remoteURL+ " - ", error);
				throw error;
			}
		},
		query: function(query, options){
			//console.log("Remote query : ", query, options);
			options = options || {};
			try{

				var headers =  {};
				
				var session = Session.getCurrentSession(false);
				if(session && session.remoteUser)
					headers["Session-ID"] = session.id;
				if(options.start || options.end){
					headers.range = "items=" + options.start + '-' + options.end; 
				}

				this.setRemoteHeaders(options, headers);

				query = query.replace(/\$[1-9]/g, function(t){
					return JSONExt.stringify(options.parameters[t.substring(1) - 1]);
				});

				var finalURL = this.remoteURL;
				if(query && query != null && query != 'null' && query != "")
					if(query[0] == "?")
						finalURL += query;
					else
						finalURL += "?"+query;

				return deep.when(request({
					method:"GET",
					url:finalURL,
					//queryString: query,
					headers: headers
				})).done(function (success) {
					createParser('QUERY')
				}).fail(function  (error) {
					console.log("error (remote HTTP call failed) while calling remote-services : query::"+this.remoteURL+ " - ", error);
					return error;
				});
			}catch(error){
				console.log("error (throw) while calling remote-store : query::"+this.remoteURL+ " - ", error);
				throw error;
			}
		},
		"delete": function(id){
		//	console.log("Remote delete : ", id);
			options = options || {};
		
			var headers = {};
			
			headers["Accept-Language"] = options["accept-language"];
			headers["referer"] = options["referer"];
			//deepCopy(this.headers, headers, false);
			var session = Session.getCurrentSession(false);
			if(session && session.remoteUser)
				headers["Session-ID"] = session.id;
			return request({
				method:"DELETE",
				pathInfo: (this.remoteURL[this.remoteURL.length-1]=="/")?(this.remoteURL+id):(this.remoteURL+"/"+id),
				headers: headers

			});
		}
	}


function createParser(method){
	return function (response)
	{
		
		if(console && console.flags && console.flags["remote-rest"])
			console.log("remote-rest : "+method+" - direct response from remote  : ", response.status, " body : ", response.body);
		
		var def = deep.Deferred();
		try{
			when(response.body.join('')).then(function(resolved){
				//console.log("remote "+method+" done : result : ", resolved)
				if(typeof resolved === "string")
				{
					//console.log("result is string : try parse")
					var p = null;
					try{
						p = JSON.parse(resolved);
					}catch(e){
						p = null;
					}
					if(p)
						resolved = p;

					if(typeof resolved == "string")
					{
						try{
							p = JSON.parse(resolved);
						}catch(e){
							p = null;
						}
						if(p)
							resolved = p;
					}
					if(console && console.flags && console.flags["remote-rest"])
						console.log("remote-rest : "+method+" - after parsing/resolving : body ? ", resolved);
						/*for(var i in resolved)
						{
							console.log("resolved gives : key ", i, " - val : ", resolved[i] )
						}*/
				}
				def.resolve(resolved);
			}, function(r){
				def.reject(r);
			});
		}catch(e){
				def.reject(e);
			}
		return deep.promise(def);
	}
}




return Remote;
});
