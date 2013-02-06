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
var Session = require("autobahn/session");
var erros = require("autobahn/errors");

var Remote = function (argument) {
	// body...
}
Remote.prototype = {
		setResponseHeaders : function (options, remoteResponse) {
			
		},	
		setRequestHeaders : function (options, requestHeaders) {
		
			if(!options)
				return;

			if(options.session)
				requestHeaders["Session-ID"] = options.session.id;
			if(options.request.headers.referer)
				requestHeaders["referer"] = options.request.headers.referer;
			if(options.request.headers["accept-language"])
				requestHeaders["accept-language"] = options.request.headers["accept-language"];

		},
		dummies:null,
		remoteURL:null,
		get: function(id, options){
			options = options || {};

			var self = this;

			try{
				//construct of the url
				var url = (this.remoteURL[this.remoteURL.length-1]=="/")?(this.remoteURL+id):(this.remoteURL+"/"+id);
				/*if(console && console.flags && console.flags["remote-rest"])
					console.log("Remote-rest : get : ", url);//
				*/
				//set the headers
				var headers = {};
				
				this.setRequestHeaders(options, headers);
				
				return deep.when(request({
					method:"GET",
					url:url,
					//queryString: query,
					headers: headers
				}))
				.done( function  (success) {
					createParser("GET", self, options);
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
			var self = this;
			options = options || {};

			try{
				//console.log("Remote put : ", id);
				if(!options.id)
					throw new AccessError("Store need id on put");

				var id = object.id || options.id;

				var finalURL = (this.remoteURL[this.remoteURL.length-1]=="/")?(this.remoteURL+id):(this.remoteURL+"/"+id);

				var headers =  {};
				
				this.setRequestHeaders(options, headers);

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
						createParser("PUT", self, options)
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
			var self = this;
			options = options || {};


			try{
				//if(console && console.flags && console.flags["remote-rest"])
					console.log("REMOTE STORE : post : ", object, " - on  ", this.remoteURL, " - accepted language : ",options["accept-language"])

				var headers = {};

				this.setRequestHeaders(options, headers);

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
						createParser("POST", self, options)
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
			var self = this;

			//console.log("Remote query : ", query, options);
			options = options || {};
			try{

				var headers =  {};
				
				if(options.start || options.end){
					headers.range = "items=" + options.start + '-' + options.end; 
				}

				this.setRequestHeaders(options, headers);

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
					createParser('QUERY', self, options)
				}).fail(function  (error) {
					console.log("error (remote HTTP call failed) while calling remote-services : query::"+this.remoteURL+ " - ", error);
					return error;
				});
			}catch(error){
				console.log("error (throw) while calling remote-store : query::"+this.remoteURL+ " - ", error);
				throw error;
			}
		},
		"delete": function(id, options){
			var self = this;

		//	console.log("Remote delete : ", id);
			options = options || {};
		
			var headers = {};
			
			this.setRequestHeaders(options,headers);

			return request({
				method:"DELETE",
				pathInfo: (this.remoteURL[this.remoteURL.length-1]=="/")?(this.remoteURL+id):(this.remoteURL+"/"+id),
				headers: headers

			});
		}
	}


function createParser(method, store, options){
	return function (response)
	{
		
		if(console && console.flags && console.flags["remote-rest"])
			console.log("remote-rest : "+method+" - direct response from remote  : ", response.status, " body : ", response.body);
		
		store.setResponseHeaders( options, response);

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
