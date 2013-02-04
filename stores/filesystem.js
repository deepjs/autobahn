if(typeof define !== 'function'){
	var define = require('amdefine')(module);
}
define(function(require){

var deep = require("deep/deep");
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


/**
 * A very simple filesystem json storage
 */
var fs = require("promised-io/fs"),
	MIME_TYPES = require("pintura/jsgi/mime").MIME_TYPES;
	//AutoTransaction = require("perstore/transaction").AutoTransaction;
function writeFile(store, object, filename)
{
	var path = store.dataFolder+"/"+filename;
	var file = fs.open(path, "wb");
	return when(file).then(function(){
		file.write(JSON.stringify(object)+"\r\n");
			//console.log("file writted : ",JSON.stringify(object));
			file.close();
			return object;
	}, function(e){
		throw new Error("FSStore failed to write file "+e)
	});
}
function BinaryFile(){
}

var FileSystem = function(options){
	var fsRoot = options.dataFolder;
	var store = {
		dataFolder:fsRoot,
		get: function(id, metadata){
			var returnMetas = false;
			if(id.search(/(:meta-data)$/gi) > -1)
			{
				returnMetas = true;
				id = id.substring(0,id.length-10);
			}
			//console.log("FileSystem get(): " + id + " - ", returnMetas);
			var filename = this.dataFolder+"/"+id;

			var def = deep.Deferred();
		
			nodeFS.stat(filename, function(error, stats){
				//console.log("FileSystem getStat(): " + id + " - ", stats, " - ", error);
				
				try{
					if(error || !stats.isFile())
					{
						var msg  = "FSStore  get : "+id+" : error : "+e+" while reading file ";
						console.log(msg);
						def.reject(msg);
						return;
					}		
				}
				catch(e)
				{
					var msg  = "FSStore  get : "+id+" : error : "+e+" while reading file ";
					console.log(msg);
					def.reject(msg);
					return;
				}

				var f = new BinaryFile();
				f.body = "";

				if(returnMetas)
				{
					var extension = filename.match(/\.[^\.]+$/);
					f.id = id;
					f.getMetadata = function(){
						return f;
					}
					var pathParts = filename.split("/")
					var fname = pathParts[pathParts.length-1];
					Object.defineProperty(f,"alternates",{
						value: [f]
					});
					//console.log("FSStore : get : stats : ", stats)
					//console.log("FSStore : get : metadata : ", metadata)
					f['content-type']= MIME_TYPES[extension] ;
					f['uri']= "http://"+metadata.host+"/"+filename ;
					f['last-update'] = stats.mtime;
					f['content-disposition']=  "inline; filename=" + fname;
					
				}
			
				when(fs.read(filename)).then(function(res){
					//console.log("FileSystem file open " + res);
					try{
						f.body = JSON.parse(res);
					}catch(e)
					{	
						f.body = "error when parsing file : "+e;
					}
					if(returnMetas)
					{
						//console.log("asking meta-data of file");
						def.resolve(f);
					}	
					else
						def.resolve(f.body);
				});
			});
			//console.log("before proise return of FSStore get")
			return deep.promise(def);
		},
		post: function(object, directives){
			//console.log("fs : post : ", object, directives)
			directives = directives || {};
			var id = object.id;
			var othis = this;
			if(!id)
				id = object.id = directives.id;
			else
				directives.id = id;
			if(!id) 
				return when(generateId(options.dataFolder)).then(function(id){
					object.id = directives.id = id;
					return othis.post(object, directives) ;
				}) 
			var filename = id;
			return when(fs.stat(this.dataFolder+"/"+filename)).then(
				function(res){
					if(res.code !== "ENOENT")
						throw new AccessError("FSStore : Can not post : existing file !!");
					return writeFile(store, object, filename);
				},
				function(e){
					console.log("file don't exist : could post : ",e)

					return writeFile(store, object, filename);
				});
		},
		put: function(object, directives){
			directives = directives || {};
			var id = object.id;
			if(!id)
				id = object.id = directives.id;
			if(!id)
				throw new Error("FSStore put need id !!")
			var filename = id;
			//console.log("FS Store : put : id : ", id);
			return when(fs.stat(this.dataFolder+"/"+filename)).then(
				function(){
					return writeFile(store, object, filename);
				},
				function(){
					console.log("FSStore put don't have previous file to overwrite for : ", id);
					return writeFile(store, object, filename);
				});
		},
		"delete": function(id, directives){
			var path = id;
			store.addToTransactionQueue(function(){
				fs.remove(path);
			});
		}
	};
	return store;
}

function generateId(dataFolder){
	return when(fs.stat(dataFolder)).then(function(res){
		//console.log("reading datafolder stats : ", res);
		var collectionSize = res.nlink;
		collectionSize++;
		var filename =  "fs-store-file"+collectionSize+Math.random().toString().substring(2,6)+".json";
		return filename;
	})
}

return FSStore;
})