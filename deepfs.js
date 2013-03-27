if(typeof define !== 'function'){
	var define = require('amdefine')(module);
}

define(function (require){
	var deep = require("deep/deep");
	var fs = require("fs");
	deep.stores.fs = {
		get:function (path, options) {
			var def = deep.Deferred();
			fs.readFile(path, function(err, html){
				if(err)
					def.reject(err);
				else
					def.resolve(html);
			});
			return deep.promise(def);
		}
	}
});