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
	var deep = require("deep/deep");
	deep.stores.remotejson = new deep.store.DeepStore();

	deep.stores.remotejson.extensions = [
		/(\.json(\?.*)?)$/gi
	];
	deep.stores.remotejson.baseUri = "";
	deep.stores.remotejson.setCustomHeaders = function (headers, request) {
		// body...
	}
	deep.stores.remotejson.setRequestHeaders = function (headers, request) {
		// body...
	}
	deep.stores.remotejson.get = deep.stores.remotejson.query = function (id, options) {
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
		var d = deep(request(infos))
		.done(function(data){
			data = data.body;
			if(!noCache && (options && options.cache !== false)  || (self.options && self.options.cache !== false))
				deep.mediaCache.manage(data, id);
			return data;
		})
		.fail(function(error){
			console.log("deep.stores.remotejson.get error : ",id," - ", error);
			return new Error("deep.store.remotejson failed : "+id+" - \n\n"+JSON.stringify(error));
		})
		.done(function (datas, handler) {
			//console.log("json.get : result : ", datas);
			return deep(datas).nodes(function (nodes) {
				handler._entries = nodes;
			});
		})
		.store(this)
		.done(function (success, handler) {
			//console.log("json.get : "+id+" : result : ", success);
			handler.range = deep.Chain.range; // reset range function to default chain behaviour
		});
		if(!noCache && (options && options.cache !== false)  || (self.options && self.options.cache !== false))
			deep.mediaCache.manage(d, id);
		return d;
	};
	deep.stores.remotejson.put = function (object, options) {
		var id = object.id || "";
		id = this.baseUri + object.id;
		var self = this;
		var def = deep.Deferred();
		options = options || {};
		var infos = url.parse(id);
		infos.headers = {
			"Accept" : "application/json; charset=utf-8",
			"Content-Type":"application/json; charset=utf-8;"
		};
		infos.method = "PUT";
		this.setRequestHeaders(infos.headers, options.request);
		request(infos, object)
		.done(function (success) {
			def.resolve(success.body);
		})
		.fail(function  (error) {
			def.reject(new Error("deep.store.remotejson.put failed : "+id+" - details : "+JSON.stringify(error)));
		});
		return deep(deep.promise(def))
		.store(this)
		.done(function (success, handler) {
			handler.range = deep.Chain.range;
		});
	};
	deep.stores.remotejson.post = function (object, options) {
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
		.done(function (success, handler) {
			console.log("remotejson end chain on post")
			handler.range = deep.Chain.range;
		});
	};
	deep.stores.remotejson.del = function (id, options) {
		id = id || "";
		id = this.baseUri + id;
		var self = this;
		var def = deep.Deferred();
		options = options || {};
		var infos = url.parse(id);
		infos.headers = {
			"Accept" : "application/json; charset=utf-8"
			//"Content-Type":"application/json; charset=utf-8;"
		};
		infos.method = "DELETE";
		this.setRequestHeaders(infos.headers, options.request);
		request(infos)
		.done(function (success) {
			def.resolve(success.body);
		})
		.fail(function  (error) {
			def.reject(new Error("deep.store.remotejson.del failed : "+id+" - details : "+JSON.stringify(error)));
		});
		return deep(deep.promise(def))
		.store(this)
		.done(function (success, handler) {
			handler.range = deep.Chain.range;
		});
	};
	deep.stores.remotejson.patch = function (object, id, options) {
		id = id || "";
		id = this.baseUri + id;
		var self = this;
		var def = deep.Deferred();
		options = options || {};
		var infos = url.parse(id);
		infos.headers = {
			"Accept" : "application/json; charset=utf-8",
			"Content-Type":"application/json; charset=utf-8;"
		};
		infos.method = "PATCH";
		this.setRequestHeaders(infos.headers, options.request);
		request(infos, object)
		.done(function (success) {
			def.resolve(success.body);
		})
		.fail(function  (error) {
			def.reject(new Error("deep.store.remotejson.put failed : "+id+" - details : "+JSON.stringify(error)));
		});
		return deep(deep.promise(def))
		.store(this)
		.done(function (success, handler) {
			handler.range = deep.Chain.range;
		});
	};
	/*deep.stores.remotejson.bulk = function (arr, uri, options) {
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
		return deep(deep.promise(def))
		.store(this)
		.done(function (success, handler) {
			handler.range = deep.Chain.range;
		});
	};
	deep.stores.remotejson.rpc = function (method, params, id) {
		var self = this;
		var callId = "call"+new Date().valueOf();
		var def = deep.Deferred();
		$.ajax({
			beforeSend :function(req) {
				writeJQueryDefaultHeaders(req);
				req.setRequestHeader("Accept", "application/json; charset=utf-8;");
			},
			type:"POST",
			url:id,
			//dataType:"application/json-rpc; charset=utf-8;",
			contentType:"application/json-rpc; charset=utf-8;",
			data:JSON.stringify({
				id:callId,
				method:method,
				params:params||[]
			})
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
				def.reject(new Error("deep.store.remotejson.rpc failed : "+id+" - details : "+JSON.stringify(arguments)));
		});
		return deep(deep.promise(def))
		.store(this)
		.done(function (success, handler) {
			handler.range = deep.Chain.range;
		});
	};
	*/
	deep.stores.remotejson.range = function (arg1, arg2, query, options)
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

		function success(data){
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
				console.log("ERROR deep.stores.remotejson.range : range header missing !! ");
			rangeResult = deep.utils.createRangeObject(rangeResult.start, rangeResult.end, rangeResult.totalCount);
			rangeResult.results = data.body;
			return rangeResult;
		}

		request(info)
		.done(function (data) 
		{
			def.resolve( success(data) );
		})
		.fail(function (error) 
		{
			def.reject(new Error("deep.store.remotejson.range failed : details : "+JSON.stringify(arguments)));
		});

		return deep(deep.promise(def))
		.done(function (rangeObject, handler) {
			handler._entries = deep(rangeObject.results).nodes();
			return rangeObject;
		})
		.store(this)
		.done(function (success, handler) {
			handler.range = deep.Chain.range;
		});
	};
	deep.stores.remotejson.init = function (options)
	{

	}
	deep.stores.remotejson.create = function (name, uri, options)
	{
		var store = deep.utils.bottom(deep.stores.remotejson, {
			baseUri:uri,
			options:options,
			create:deep.collider.remove()
		});
		deep.stores[name] = store;
		store.name = name;
		return store;
	};
	return deep.stores.remotejson;
});