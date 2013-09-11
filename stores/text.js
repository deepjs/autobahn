if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(["require"],function (require)
{

	var deep = require("deep/deep");
	var fs = require("fs");

	//__________________________________________________
	deep.protocoles.text = new deep.Store();
	//var writeJQueryDefaultHeaders = function (req) {};
	deep.extensions.push({
		extensions:[
			/(\.(text|htm|xhtm|xtext)(\?.*)?)$/gi
		],
		store:deep.protocoles.text
	});
	deep.protocoles.text.get = function (path, options) {
		options = options || {};
		if(options.cache !== false && deep.mediaCache.cache["text::"+path])
			return deep(deep.mediaCache.cache["text::"+path]).store(this);
		var def = deep.Deferred();
		fs.readFile(path, function(err, datas){
			if(err)
				return def.reject(err);
			if(datas instanceof Buffer)
				datas = datas.toString("utf8");
			def.resolve(datas);
		});
		var d = deep(def.promise()).store(this);
		if(options.cache !== false || (self.options && self.options.cache !== false))
			deep.mediaCache.manage(d, "text::"+path);
		return d;
	};
	return deep.protocoles.text;

});