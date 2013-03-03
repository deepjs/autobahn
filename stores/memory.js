if(typeof define !== 'function'){
	var define = require('amdefine')(module);
}
define(function(require){

var deep = require("deep/deep");
var DatabaseError = require("perstore/errors").DatabaseError,
	AccessError = require("perstore/errors").AccessError,
	MethodNotAllowedError = require("perstore/errors").MethodNotAllowed;
var autobahnController = require("autobahn/autobahn-controller");


var MemoryStore = {
		dummies:null,
		init:function(options){ // type:readOnly|memory|persistent     options : { index:{}, path:"data", filename:"MyDB", log:[] }
			this.store = new Memory();
			this.store.init(options);
		},
		get: function(id, options){
			try{
			return deep.when(this.store.get(id, options)).then(function(res){
				return res;
			}, function(error){
				console.log("error while get Memory services - ", error);
				return { status:500, headers:{}, body:["error 500 (Memory store get)"]};
			});
			}catch(error){
				console.log("error (throw) while get Memory store : - ", error);
				return { status:500, headers:{}, body:["error 500 (Memory store get)"]};
			}
		},
		put: function(object, options){
			try{

			if(console.flags && console.flags["memory-store"])
				console.log("Memory : post : ", object)

			return deep.when(this.store.put(object, options)).then(function (res){
				return object;
			},function  (error) {
				// body...
				console.log("error while put Memory services : - ", error);
				return { status:500, headers:{}, body:["error 500 (Memory store put)"]};
			});
			}catch(error){
				console.log("error (throw) while put Memory store :  - ", error);
				return { status:500, headers:{}, body:["error 500 (Memory store put)"]};
			}
		},
		post: function(object, options){
			
			try{
			if(console && console.flags && console.flags["memory-store"])
				console.log("REMOTE STORE : post : ", object)

			return deep.when(this.store.post(object, options)).then(function(res){
				return object;
			}, function  (error) {
				console.log("error while posting Memory services :  - ", error);
				return { status:500, headers:{}, body:["error 500 (Memory store post)"]};
			});
			}catch(error){
				console.log("error (throw) while posting Memory store :  - ", error);
				return { status:500, headers:{}, body:["error 500 (Memory store post)"]};
				//throw new Error("error while memory-store.post : ", error);
			}
		},
		query: function(query, options){
			//console.log("Remote query : ", query, options);
			try{
			var headers = options || {};
			if(headers.start || headers.end){
				headers.range = "items=" + headers.start + '-' + headers.end; 
			}
			if(options && options.parameters)
				query = query.replace(/\$[1-9]/g, function(t){
					return JSONExt.stringify(options.parameters[t.substring(1) - 1]);
				});
			return deep.when(this.store.query(query, headers)).then(function(res){ 
				return res;
			},function  (error) {
				console.log("error while querying Memory services :  - ", error);
				return { status:500, headers:{}, body:["error 500 (Memory store query)"]};
			});
			}catch(error){
				console.log("error (throw) while querying Memory store :  - ", error);
				return { status:500, headers:{}, body:["error 500 (Memory store query)"]};
			}
		},
		"delete": function(id, options){
		//	console.log("Remote delete : ", id);
			var headers = options || {};
			deep.utils.bottom(this.headers, headers);
			return this.store.delete(id);
		}
	}

	var PreconditionFailed = require("perstore/errors").PreconditionFailed;
	var Memory = MemoryStore.store = function(){
		this.index = {}
	}

	Memory.prototype = {
		init:function () {
			this.index = this.index || {};
		},
		get : function(id, directives){
			directives = directives || {};
			return this.index[id] || null;
		},
		query : function(query, directives){
			if(query[0] == "?")
				query = query.substring(1);
			//console.log("Memory store query : ", query, directives);
			var def = promise.Deferred();
			deep.when(deep.query(this.index, "/?"+query)).then(function(res){
				def.resolve(res)
			})
			return promise.promise(def);
		},
		put : function(object, directives){
			directives = directives || {};
			var id = object.id;
			if(!id)
				id = object.id = directives.id;
			if(!id)
				throw new Error("Memory-store.put need id !!")
			this.index[id] = object;
			return object;
		},
		post : function(object, directives){
			directives = directives || {};
			var id = object.id;
			if(!id)
				id = object.id = directives.id;
			if(id && this.index[id])
				throw new AccessError("MemoryStore : could not post : id already exists !!");
			if(!id)
				id = object.id = directives.id = new Date().getTime()+Math.round(Math.random()*10000000000000);
			this.index[id] = object;
			return object;
		},
		"delete" : function(id, directives){
			var exists = this.index[id];
			delete this.index[id];
			return (exists !== undefined)?true:false;
		},
		indexes : null
	};

return MemoryStore;
})