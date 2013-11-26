if(typeof define !== 'function'){
	var define = require('amdefine')(module);
}
define(function(require){


var deep = require("deepjs/deep");
var when = deep.when;
var DatabaseError = require("perstore/errors").DatabaseError,
	AccessError = require("perstore/errors").AccessError,
	MethodNotAllowedError = require("perstore/errors").MethodNotAllowed;

var autobahnController = require("autobahn/autobahn-controller");
var MetaStore = function(){}
MetaStore.prototype = {
		dummies:null,
		metasConstructors:{
			"last-update":function(){ return new Date().toISOString(); }
		},
		updateMetas:function(object, metas, id){
			metas = metas || {};
			var constructors = this.metasConstructors;
			for(var i in constructors)
				if(!constructors.hasOwnProperty(i))
					metas[i] = constructors[i](object);
			this.setMetas(object, metas, id)
			return metas;
		},
		setMetas:function(object, metas, id){
			object.__metas = metas;
		},
		getMetas:function(object, id){
			return object.__metas;
		},
		hideMetas:function(object, id){
			delete object.__metas;
		},
		get:deep.compose.around(function(oldGet){
			return function(id, options){
				var returnMetas = false;
				if(id.search(/(:meta-data)$/gi) > -1)
				{
					returnMetas = true;
					id = id.substring( 0, id.length-10);
				}
				try{
					return when(oldGet.apply(this,[id, options])).then(function(res){
						if(!returnMetas)
						{	
							this.hideMetas(res, id);
							return res;
						}
						else
						{
							var metas = this.getMetas(res, id);
							this.hideMetas(res, id);
							metas.body = res;
							return metas;
						}
					}, function(error){
						console.log("error while get Memory services - ", error);
						return null;
					});
				}catch(error){
					console.log("error (throw) while get Memory store : - ", error);
					return null;
				}
			}
		}) ,
		put: function(object, options){
			try{

			if(console && console.flags && console.flags["memory-store"])
				console.log("Memory : post : ", object)

			return when(this.store.put(object, options)).then(function (res){
				return object;
			},function  (error) {
				// body...
				console.log("error while put Memory services : - ", error);
				return null;
			});
			}catch(error){
				console.log("error (throw) while put Memory store :  - ", error);
				return null;
			}
		},
		post: function(object, options){
			
			try{
			if(console && console.flags && console.flags["memory-store"])
				console.log("REMOTE STORE : post : ", object)

			return when(this.store.post(object, options)).then(function(res){
				return object;
			}, function  (error) {
				console.log("error while posting Memory services :  - ", error);
				return null;
			});
			}catch(error){
				console.log("error (throw) while posting Memory store :  - ", error);
				return null;
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
			return when(this.store.query(query, headers)).then(function(res){ 
				return res;
			},function  (error) {
				console.log("error while querying Memory services :  - ", error);
				return null;
			});
			}catch(error){
				console.log("error (throw) while querying Memory store :  - ", error);
				return null;
			}
		}
	}


return MemoryStore;
})