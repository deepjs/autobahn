if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(["require"],function (require)
{

	var deep = require("deep/deep");
	var fs = require("fs");

	//__________________________________________________
	deep.protocoles.html = new deep.Store();
	//var writeJQueryDefaultHeaders = function (req) {};
	deep.extensions.push({
		extensions:[
			/(\.(html|htm|xhtm|xhtml)(\?.*)?)$/gi
		],
		store:deep.protocoles.html
	});
	deep.protocoles.html.get = function (path, options) {
		options = options || {};
		if(options.cache !== false && deep.mediaCache.cache[id])
			return deep(deep.mediaCache.cache[id]).store(this);
		var def = deep.Deferred();
		fs.readFile(path, function(err, datas){
			if(datas instanceof Buffer)
				datas = datas.toString("utf8");
			if(err)
				def.reject(err);
			else
				def.resolve(datas);
		});
		var d = deep(def.promise()).store(this);
		if(options.cache !== false || (self.options && self.options.cache !== false))
			deep.mediaCache.manage(d, id);
		return d;
	};
	return deep.protocoles.html;

});