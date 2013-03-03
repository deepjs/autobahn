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
			if(console && console.flags && console.flags["Mongorest"])
				console.log("Mongo : get : ", url);//
			var headers = options || {};
			if(this.headers)
				deepCopy(this.headers, headers, false);
		
			return when(this.mongo.get(id, headers)).then(function(res){
				return res;
			}, function(error){
				console.log("error while calling (get)  Mongoservices - ", error);
				return { status:500, headers:{}, body:["error 500 (Mongo store get)"]};
			});
			}catch(error){
				console.log("error (throw) while calling (get) Mongostore : - ", error);
				return { status:500, headers:{}, body:["error 500 (Mongo store get)"]};
			}
		},
		put: function(object, options){
			try{
			if(console && console.flags && console.flags["Mongorest"])
				console.log("Mongo : post : ", object)

			return when(this.mongo.put(object, options)).then(function (res){
				return res;
			},function  (error) {
				// body...
				console.log("error while calling Mongoservices : - ", error);
				return  { status:500, headers:{}, body:["error 500 (Mongo store put)"]};
			});
			}catch(error){
				console.log("error (throw) while calling Mongostore :  - ", error);
				return  { status:500, headers:{}, body:["error 500 (Mongo store put)"]};
			}
		},
		post: function(object, options){
			
			try{
			if(console && console.flags && console.flags["Mongorest"])
				console.log("REMOTE STORE : post : ", object)

			return when(this.mongo.put(object, options)).then(function(res){
				return res;
			}, function  (error) {
				console.log("error while calling Mongoservices :  - ", error);
				return  { status:500, headers:{}, body:["error 500 (Mongo store post)"]};
			});
			}catch(error){
				console.log("error (throw) while calling Mongostore :  - ", error);
				return  { status:500, headers:{}, body:["error 500 (Mongo store post)"]};
				//throw new Error("error while Mongorest.post : ", error);
			}
		},
		query: function(query, options){
			//console.log("Remote query : ", query, options);
			try{

			var headers = (options && options.responseHeaders) || {};

			//headers["Accept-Language"] = options["accept-language"];
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

			//console.log("Mongo will do query : ", query, options);
			return when(this.mongo.query(query, headers)).then(function(res){ 
				// console.log("Mongo query res : ", res);
				return res;
			},function  (error) {
				console.log("error while calling (query) Mongoservices :  - ", error);
				return  { status:500, headers:{}, body:["error 500 (Mongo store query)", JSON.stringify(error)]};
			});
			}catch(error){
				console.log("error (throw) while calling  (query)  Mongostore :  - ", error);
				return  { status:500, headers:{}, body:["error 500 (Mongo store query)", JSON.stringify(error)]};
			}
		},
		"delete": function(id, options){
		//	console.log("Remote delete : ", id);
			var headers = options || {};
			deepCopy(this.headers, headers, false);
			return this.mongo.delete(id);
		}
	}

return Mongo;
})