if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(["require"],function (require)
{

	var deep = require("deep/deep");
	var fs = require("fs");

	//__________________________________________________
	deep.protocoles.json = new deep.Store();
	//var writeJQueryDefaultHeaders = function (req) {};
	deep.extensions.push({
		extensions:[
			/(\.(json|htm|xhtm|xjson)(\?.*)?)$/gi
		],
		store:deep.protocoles.json
	});
	deep.protocoles.json.get = function (path, options) {
		options = options || {};
		if(options.cache !== false && deep.mediaCache.cache[id])
			return deep(deep.mediaCache.cache[id]).store(this);
		var def = deep.Deferred();
		fs.readFile(path, function(err, datas){
			if(err)
				def.reject(err);
			if(datas instanceof Buffer)
				datas = datas.toString("utf8");
			def.resolve(JSON.parse(datas));
		});
		var d = deep(def.promise()).store(this);
		if(options.cache !== false || (self.options && self.options.cache !== false))
			deep.mediaCache.manage(d, id);
		return d;
	};
	return deep.protocoles.json;

});