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
var Memory = require("autobahn/stores/memory");
var nodeFS = require("fs");

var PersistentStore = function () {
	console.log("PersistentStore.constructor")
}

PersistentStore.prototype = {
		dummies:null,
		filePath:null,
		init:function(options){ //  options : { dataFolder:"" }
			options = options || {};
			if(options.filePath)
				this.filePath = options.filePath;
			this.store = new Persistent({filePath:this.filePath});
		}
	}

var fs = require("promised-io/fs");
	//AutoTransaction = require("perstore/transaction").AutoTransaction;
function writeToDisk(index, filename)
{
	var file = fs.open(filename, "wb");
	return when(file).then(function(){
		file.write(JSON.stringify(index)+"\r\n");
		//console.log("file writted : ",JSON.stringify(object));
		file.close();
		return index;
	}, function(e){
		throw new Error("PersistentStore failed to write file "+e)
	});
}
var Persistent = function (argument) {
	
}

Persistent.prototype = {
	init:deep.compose.after(function(options){
		this.filePath = options.filePath;
		this.index = this.index || {};
		var othis = this;
		try{
			nodeFS.stat(this.filePath, function(error, stats){
				if(error || !stats.isFile())
				{
					if(error.code = "34")
						writeToDisk(othis.index, othis.filePath);
					else
						throw new Error("Persistent Store : "+JSON.stringify(error));
					return;
				}
		
				var file = fs.read(othis.filePath);
				when(file).then(function(res){
					othis.index = JSON.parse(res);
					//console.log("loaded database from file : ", othis.index)
				});
			});
		
		}catch(e){
			//console.log("PersistentStore no file exists before (throw). creating one when post/put. ", e);
			writeToDisk(this.index, this.filePath);
		}
	}),
	filePath:null,
	post:deep.compose.after(function(object, directives){
		writeToDisk(this.index, this.filePath);
	}),
	put:deep.compose.after(function(object, directives){
		writeToDisk(this.index, this.filePath);
	}),
	"delete":deep.compose.after(function( id, directives){
		writeToDisk(this.index, this.filePath);
	})
};
deep(Persistent.prototype).bottom(Memory.store.prototype);
console.log("Persistent : will return : ",new PersistentStore())
return PersistentStore;
})