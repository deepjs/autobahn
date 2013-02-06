if(typeof define !== 'function'){
	var define = require('amdefine')(module);
}
define(function(require){

var deep = require("deep/deep");
var formidable = require('formidable');
var when = deep.when;
var DatabaseError = require("perstore/errors").DatabaseError,
	AccessError = require("perstore/errors").AccessError,
	MethodNotAllowedError = require("perstore/errors").MethodNotAllowedError;
var autobahnController = require("autobahn/autobahn-controller");
var nodeFS = require("fs");
var FSStore = function(options){
	options = options || {};
	if(options.dataFolder)
		this.dataFolder = options.dataFolder;
	this.store = FileSystem({dataFolder:this.dataFolder});
}
FSStore.prototype = {
		dummies:null,
		get: function(id, options){
			try{
			console.log("FSSotre get : "+id)
			return when(this.store.get(id, options)).then(function(f){
				console.log("FSSotre get : res : "+f)

				return f;
			}, function(error){
				console.log("error while getting on FS services - ", error);
				return { status:500, headers:{}, body:["error 500 (FS store get)"]};
			});
			}catch(error){
				console.log("error (throw) while gettong on FS store : - ", error);
				return { status:500, headers:{}, body:["error 500 (FS store get)"]};
			}
		},
		put: function(object, options){
			try{

			if(console && console.flags && console.flags["fs-store"])
				console.log("FS : post : ", object)

			return when(this.store.put(object, options)).then(function (res){
				return object;
			},function  (error) {
				// body...
				console.log("error while puting on FS services : - ", error);
				return { status:500, headers:{}, body:["error 500 (FS store put)"]};
			});
			}catch(error){
				console.log("error (throw) while puting on FS store :  - ", error);
				return { status:500, headers:{}, body:["error 500 (FS store put)"]};
			}
		},
		post: function(object, options){
			
			try{
			return when(this.store.post(object, options)).then(function(res){
				return object;
			}, function  (error) {
				console.log("error while posting on FS services :  - ", error);
				//if(error instanceof AccessError)	
					//throw error;
				return { status:500, headers:{}, body:["error 500 (FS store post)"]};
			});
			}catch(error){
				console.log("error (throw) while posting on FS store :  - ", error);
				return { status:500, headers:{}, body:["error 500 (FS store post)"]};
				//throw new Error("error while fs-store.post : ", error);
			}
		},
		query: function(query, options){
			//console.log("fs query : ", query, options);
			if(query[0] == "?")
				query = query.substring(1);
			//console.log("FS store query : ", query, options);
			var def = deep.Deferred();
			nodeFS.readdir(this.dataFolder, function(error, files){
				//console.log("FS store query results : ", error, files);
				if(error)
					def.reject(error);
				else if(query != "")
					deep.when(deep.rql(files, query, {})).then(function(res){
						def.resolve(res)
					})
				else
					def.resolve(files);
			})
			return deep.promise(def);
		},
		"delete": function(id, options){
		//	console.log("Remote delete : ", id);
			var headers = options || {};
			deepCopy(this.headers, headers, false);
			return this.store.delete(id);
		}
	}


return FSStore;
})