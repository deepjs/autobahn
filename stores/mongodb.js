if(typeof define !== 'function'){
	var define = require('amdefine')(module);
}
define(function(require){
var MongoDB = require("perstore/store/mongodb").MongoDB;
var deep = require("deep/deep");
var when = deep.when;
var DatabaseError = require("perstore/errors").DatabaseError,
	AccessError = require("perstore/errors").AccessError,
	MethodNotAllowedError = require("perstore/errors").MethodNotAllowed;
	var errors = require("autobahn/errors");
var Mongo = function(){}
Mongo.prototype =  {
		dbURL:null,
		collectionName:null,
		init:function(options){
			console.log("MONGO DB : init _________________________________ ",this.dbURL, this.collectionName)
			this.mongo = MongoDB({url:this.dbURL, collection: this.collectionName});
		},
		get: function(id, options){
			try{
			//if(console && console.flags && console.flags["Mongorest"])
			//console.log("Mongo : get : ", id, options);//
			options = options || {};

			var headers = {};
			if(options.response)
				headers = options.response.headers || {};
			if(this.headers)
				deep.utils.deepCopy(this.headers, headers, false);
			//console.log("mongo after set headers : ", headers);
			return when(this.mongo.get(id, headers)).then(function(res){
				//console.log("mongstore (real) response : ",res);
				if(res && res.headers && res.status && res.body)
					return new errors.Server(res.body, res.status);
				return res;
			}, function(error){
				console.log("error while calling (get)  Mongoservices - ", error);
				return new errors.Server(error, 500);
			});
			}catch(error){
				console.log("error (throw) while calling (get) Mongostore : - ", error);
				return new errors.Server(error, 500);
			}
		},
		put: function(object, options){
			try{
			if(console && console.flags && console.flags["Mongorest"])
				console.log("Mongo : post : ", object)

			return when(this.mongo.put(object, options)).then(function (res){
				if(res && res.headers && res.status && res.body)
					return new errors.Server(res.body, res.status);
				return res;
			},function  (error) {
				// body...
				console.log("error while calling Mongoservices : - ", error);
				return new errors.Server(error, 500);
				//return  { status:500, headers:{}, body:["error 500 (Mongo store put)"]};
			});
			}catch(error){
				console.log("error (throw) while calling Mongostore :  - ", error);
				return new errors.Server(error, 500);
				//return  { status:500, headers:{}, body:["error 500 (Mongo store put)"]};
			}
		},
		post: function(object, options){
			
			try{
			if(console && console.flags && console.flags["Mongorest"])
				console.log("REMOTE STORE : post : ", object)

			return when(this.mongo.put(object, options)).then(function(res){
				if(res && res.headers && res.status && res.body)
					return new errors.Server(res.body, res.status);
				return res;
			}, function  (error) {
				console.log("error while calling Mongoservices :  - ", error);
				return new errors.Server(error, 500);
			});
			}catch(error){
				console.log("error (throw) while calling Mongostore :  - ", error);
				return new errors.Server(error, 500);
				//throw new Error("error while Mongorest.post : ", error);
			}
		},
		query: function(query, options){
			//console.log("deep.stores.Mongo query : ", query, options);
			options = options || {};
			try{

			var headers = (options.response && options.response.headers) || {};

			//headers["Accept-Language"] = options["accept-language"];
			if(this.headers)
				deep.utils.bottom(this.headers, headers);
			if(headers.start || headers.end){
				headers.range = "items=" + headers.start + '-' + headers.end;
			}
			query = query.replace(/\$[1-9]/g, function(t){
				return JSONExt.stringify(headers.parameters[t.substring(1) - 1]);
			});
			//hack to remove "&null" at the end of request coming from nowhere...
			var nullCharAtEnd = query.substring(query.length - 5, query.length);
			if(nullCharAtEnd == "&null")
				query = query.substring(0, query.length - 5);

			//console.log("deep.stores.Mongo will do query : ", query, options);
			return when(this.mongo.query(query, headers)).then(function(results){
				//console.log("deep.stores.Mongo query res : ", results);

				if(results && results.headers && results.status && results.body)
					return new errors.Server(results.body, results.status);
				if(!options.range)
					if(results && results._range_object_)
						return Array.prototype.slice.apply(results.results);
					else
						return Array.prototype.slice.apply(results);
				return deep(results.totalCount)
				.done(function (count) {
					//console.log("deep.stores.Mongo range query res : ", results);
					var res = deep.utils.createRangeObject(results.start, results.end-1, count);
					delete results.count;
					delete results.start;
					delete results.end;
					delete results.schema;
					delete results.totalCount;
					res.results = Array.prototype.slice.apply(results);
					res._range_object_ = true;
					return res;
				});
			},function  (error) {
				console.log("error while calling (query) Mongoservices :  - ", error);
				return new errors.Server(error, 500);
			});
			}catch(error){
				console.log("error (throw) while calling  (query)  Mongostore :  - ", error);
				return new errors.Server(error, 500);
			}
		},
		"delete": function(id, options){
			
			return this.mongo.delete(id);
		}
	}

return Mongo;
})