/**
* 
*/

if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(function (require)
{
	var url = require('url');
	var request = require("autobahn/promised-node-http");
	var errors = require("autobahn/errors");
	var deep = require("deepjs/deep");
	deep.protocoles.remotejson = new deep.Store();

	deep.protocoles.remotejson.extensions = [
		/(\.json(\?.*)?)$/gi
	];

	deep.protocoles.remotejson.forwardRPC = true;
	deep.protocoles.remotejson.baseUri = "";

	deep.protocoles.remotejson.setCustomHeaders = function (headers, request)
	{
		// body...
	}

	deep.protocoles.remotejson.setRequestHeaders = function (headers, request)
	{
		for(var i in deep.globalHeaders)
			headers[i] = deep.globalHeaders[i];

		console.log("remote st request headers : ", headers)
		// toDO : add custom headers as Referent, userId, impersonateId, ...
	}

	deep.protocoles.remotejson.get = deep.protocoles.remotejson.query = function (id, options)
	{
		//console.log("json.get : ", id);
		if(id == "?" || !id)
			id = "";
		id = this.baseUri + id;

		var noCache = true;
		for (var i = 0; i < this.extensions.length; ++i)
			if(this.extensions[i].test(id))
			{
				noCache = false;
				break;
			}

		if(!noCache && id !== "" && deep.mediaCache.cache[id])
			return deep(deep.mediaCache.cache[id]).store(this);

		var infos = url.parse(id);
		infos.headers = {
			"Accept" : "application/json; charset=utf-8"
		};
		infos.method = "GET";
		this.setRequestHeaders(infos.headers, options.request);

		var self = this;
		var d = deep(request(infos), null, { rethrow:false })
		.done(function(data){
			data = data.body;
			if(!noCache && (options && options.cache !== false)  || (self.options && self.options.cache !== false))
				deep.mediaCache.manage(data, id);
			return data;
		})
		.fail(function(error){
			//console.log("deep.protocoles.remotejson.get error : ",id," - ", error);
			throw new errors.Server(error.body||error, error.status||500);
		})
		.done(function (datas) {
			//console.log("json.get : result : ", datas);
			var handler = this;
			return deep(datas).nodes(function (nodes) {
				handler._entries = nodes;
			});
		})
		.store(this)
		.done(function (success) {
			//console.log("json.get : "+id+" : result : ", success);
			this.range = deep.Chain.range; // reset range function to default chain behaviour
		});
		if(!noCache && (options && options.cache !== false)  || (self.options && self.options.cache !== false))
			deep.mediaCache.manage(d, id);
		return d;
	};
	deep.protocoles.remotejson.put = function (object, options) 
	{
		console.log("remotejson.put : ", object, options.id);
		options = options || {};
		var id = object.id || options.id;

		if(!id)
			throw new errors.PreconditionFailed("stores.put need id in uri or in object");

		id = this.baseUri + id;
		var self = this;
		var def = deep.Deferred();
		var infos = url.parse(id);
		infos.headers = {
			"Accept" : "application/json; charset=utf-8",
			"Content-Type":"application/json; charset=utf-8;"
		};
		infos.method = "PUT";
		this.setRequestHeaders(infos.headers, options.request);
		return deep(request(infos, object)
		.done(function (success) {
			return success.body;
		})
		.fail(function  (error) {
			console.log("remotejson put failed : ", error)
			return new errors.Server(error.body||error, error.status||500)			
		}), null, { rethrow:false })
		.fail(function (error) {
			console.log("remotejson put failed 2 : ", error);
		})
		.store(this)
		.done(function (success) {
			this.range = deep.Chain.range;
		});
	};
	deep.protocoles.remotejson.post = function (object, options) {
		//console.log("remotejsn post: ", object)
		var self = this;
		options = options || {};
		var infos = url.parse(this.baseUri);
		infos.headers = {
			"Accept" : "application/json; charset=utf-8",
			"Content-Type":"application/json; charset=utf-8;"
		};
		infos.method = "POST";
		this.setRequestHeaders(infos.headers, options.request);
		return deep(request(infos, object)
		.done(function (success) {
			//console.log("remotejson success : ", success)
			return success.body;
		})
		.fail(function  (error) {
			return new errors.Server(error.body||error, error.status||500)
			//return new Error("deep.store.remotejson.post failed  - details : "+JSON.stringify(error));
		}), null, { rethrow:false })
		.store(this)
		.done(function (success) {
			//console.log("remotejson end chain on post")
			this.range = deep.Chain.range;
		});
	};
	deep.protocoles.remotejson.del = function (id, options) {
		id = id || "";
		if(!id)
			throw new errors.PreconditionFailed("stores.del need id in uri");

		id = this.baseUri + id;
		var self = this;
		options = options || {};
		var infos = url.parse(id);
		infos.headers = {
			"Accept" : "application/json; charset=utf-8"
			//"Content-Type":"application/json; charset=utf-8;"
		};
		infos.method = "DELETE";
		this.setRequestHeaders(infos.headers, options.request);
		return deep(request(infos)
		.done(function (success) {
			return success.body;
		})
		.fail(function  (error) {
			return new errors.Server(error.body||error, error.status||500)
		}), null, { rethrow:false })
		.store(this)
		.done(function (success) {
			this.range = deep.Chain.range;
		});
	};


	deep.protocoles.remotejson.patch = function (object, options) {
		options = options || {};
		var id = object.id || options.id;
		if(!id)
			throw new errors.PreconditionFailed("stores.patch need id in uri or in object");

		id = this.baseUri + id;
		var self = this;
		var infos = url.parse(id);
		infos.headers = {
			"Accept" : "application/json; charset=utf-8",
			"Content-Type":"application/json; charset=utf-8;"
		};
		infos.method = "PATCH";
		this.setRequestHeaders(infos.headers, options.request);
		return deep(request(infos, object)
		.done(function (success) {
			success.body;
		})
		.fail(function  (error) {
			return new errors.Server(error.body||error, error.status||500)
		}), null, { rethrow:false })
		.store(this)
		.done(function (success) {
			this.range = deep.Chain.range;
		});
	};
	/*
	deep.protocoles.remotejson.bulk = function (arr, uri, options) {
		var self = this;
		var def = deep.Deferred();
		$.ajax({
			beforeSend :function(req) {
				writeJQueryDefaultHeaders(req);
				req.setRequestHeader("Accept", "application/json; charset=utf-8;");
			},
			type:"POST",
			url:uri,
			dataType:"message/json; charset=utf-8;",
			contentType:"message/json; charset=utf-8;",
			data:JSON.stringify(arr)
		})
		.done(function (success) {
			def.resolve(success);
		})
		.fail(function  (jqXHR, textStatus, errorThrown)
		{
			if(jqXHR.status < 300)
			{
				var test = $.parseJSON(jqXHR.responseText);
				if(typeof test === 'string')
					test = $.parseJSON(test);
				def.resolve(test);
			}
			else
				def.reject(new Error("deep.store.remotejson.bulk failed : "+uri+" - details : "+JSON.stringify(arguments)));
		});
		return deep(deep.when(def))
		.store(this)
		.done(function (success) {
			this.range = deep.Chain.range;
		});
	};
*/
	deep.protocoles.remotejson.rpc = function (method, params, id, options) {
		options = options || {};
		if(!id)
			throw new errors.PreconditionFailed("stores.patch need id in uri or in object");
		var callId = 12;//new Date().valueOf();

		id = this.baseUri + id;
		var self = this;
		var infos = url.parse(id);
		infos.headers = {};
		infos.method = "POST";
		this.setRequestHeaders(infos.headers, options.request);
		console.log("________________ WILL RPC HEADERS (after set request headers): ", infos.headers);
		deep.utils.up({
			"Accept" : "application/json; charset=utf-8",
			"Content-Type":"application/json-rpc; charset=utf-8;"
		},infos.headers);
		return deep(request(infos, {
				id:callId,
				method:method,
				params:params||[],
				jsonrpc:"2.0"
		})
		.done(function (success) {
			console.log("rpc call remote success : ",success)
			if(success.error)
				if(success.error instanceof Error)
					return success.error;
				else
					return deep.errors.Internal(sucess.error);
				return success.result;
		})
		.fail(function  (error) {
			console.log("rpc call remote error : ",error)
			if(error.error)
				if(error.error instanceof Error)
					return error.error;
				else
					return errors.Server(error.error);
			return new errors.Server(error.body||error, error.status||500);
		}), null, { rethrow:false })
		.store(this)
		.done(function (success) {
			this.range = deep.Chain.range;
		});
	};

	
	deep.protocoles.remotejson.range = function (arg1, arg2, query, options)
	{
		query = query || "";
		query = this.baseUri + query;
		var self = this;
		var start = arg1, end = arg2;
		var def = deep.Deferred();
		options = options || {};
		var infos = url.parse(query);
		infos.headers = {
			"Accept" : "application/json; charset=utf-8",
			//"Content-Type":"application/json; charset=utf-8;",
			"Range" : "items=" +start+"-"+end
		};
		infos.method = "GET";
		this.setRequestHeaders(infos.headers, options.request);

		function success(data)
		{
			var rangePart = [];
			var rangeResult = {};
			var headers = data.headers["Content-Range"];

			headers = headers.substring(6);
			if(headers)
				rangePart = headers.split('/');

			if(headers && rangePart && rangePart.length > 0)
			{
				rangeResult.range = rangePart[0];
				if(rangeResult.range == "0--1")
				{
					rangeResult.totalCount = 0;
					rangeResult.start = 0;
					rangeResult.end = 0;
				}
				else
				{
					rangeResult.totalCount = parseInt(rangePart[1], 10);
					var spl = rangePart[0].split("-");
					rangeResult.start = parseInt(spl[0], 10);
					rangeResult.end = parseInt(spl[1], 10);
				}
			}
			else
				console.log("ERROR deep.protocoles.remotejson.range : range header missing !! ");
			rangeResult = deep.utils.createRangeObject(rangeResult.start, rangeResult.end, rangeResult.totalCount);
			rangeResult.results = data.body;
			return rangeResult;
		}

		return deep(request(info)
		.done(function (data) 
		{
			return success(data) ;
		})
		.fail(function (error) 
		{
			return new errors.Server(error.body||error, error.status||500);
		}), null, {rethrow:false })
		.done(function (rangeObject) {
			this._entries = deep(rangeObject.results).nodes();
			return rangeObject;
		})
		.store(this)
		.done(function (success) {
			this.range = deep.Chain.range;
		});
	};
	deep.protocoles.remotejson.init = function (options)
	{

	}
	deep.protocoles.remotejson.create = function (name, uri, options)
	{
		var store = deep.utils.bottom(deep.protocoles.remotejson, {
			baseUri:uri,
			options:options,
			create:deep.collider.remove()
		});
		deep.protocoles[name] = store;
		store.name = name;
		return store;
	};
	return deep.protocoles.remotejson;
});