if(typeof define !== 'function'){
	var define = require('amdefine')(module);
}

define(function (require){
	var deep = require("deep/deep");
	var fs = require("fs");
	var swig = require("swig");

	deep.stores.fs = {
		get:function (path, options) {
			var def = deep.Deferred();
			fs.readFile(path, function(err, datas){
				if(err)
					def.reject(err);
				else
					def.resolve(datas);
			});
			return deep(deep.promise(def));
		}
	};

	deep.stores.htmlfs = {
		get:function (path, options) {
			options = options || {};
			return deep.store("fs")
			.get(path, options)
			.catchError()
			.done(function (success) {
				return success.toString("utf8");
			});
		}
	};

	deep.stores.swigfs = {
		get:function (path, options) {
			options = options || {};
			return deep.store("fs")
			.get(path, options)
			.catchError()
			.done(function (success) {
				return swig.compile(success.toString("utf8"), { filename:options.fileName || path });
			});
		}
	};

	deep.stores.jsonfs = {
		get:function (path, options) {
			options = options || {};
			return deep.store("fs")
			.get(path, options)
			.catchError()
			.done(function (success) {
				return JSON.parse(success);
			});
		}
	};

});