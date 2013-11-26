if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(["require"],function (require)
{

	var deep = require("deepjs/deep");
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
		if(options.cache !== false && deep.mediaCache.cache["html::"+path])
			return deep(deep.mediaCache.cache["html::"+path]).store(this);
		var def = deep.Deferred();
		fs.readFile(path, function(err, datas){
			if(err)
			{
				delete deep.mediaCache.cache["html::"+path];
				return def.reject(err);
			}	
			if(datas instanceof Buffer)
				datas = datas.toString("utf8");
			deep.mediaCache.manage(datas, "html::"+path);
			def.resolve(datas);
		});
		var d = deep(def.promise()).store(this);
		if(options.cache !== false || (self.options && self.options.cache !== false))
			deep.mediaCache.manage(d, "html::"+path);
		return d;
	};
	return deep.protocoles.html;

});