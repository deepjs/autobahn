
var router = require("deep-route/route");
var urlparse = require('url').parse;
exports.simpleMap = function(map){
	var usableMap = [];
	for(var i in map)
	{
		var r = router.createRouter(i, false);
		usableMap.push({
			router:r,
			object:map[i]
		});
	}
	return function (req, res, next)
	{
		var pathname = urlparse(req.url).pathname;
		var items = {}
		var handled = usableMap.some(function (entry) {
			items.params = entry.router.match(pathname);
			if(items.params)
			{
				items.object = deep.utils.copy(entry.object);
				return true;
			}	
			return false;
		});

		if(handled)
		{
			//console.log("items : ", items, handled);
			deep(items.object)
			//.flatten()
			.deepLoad(items.params, false)
			.done(function(success){
				//console.log("success map loaded : ", success)
				success.context.content.join("\n");
				res.writeHead(200, {'Content-Type': 'text/html', "location":"/"});
				res.end(success.page(success.context));
			})
			.fail(function(error){
				//deep.utils.dumpError(error);
				res.writeHead(error.status || 500, {'Content-Type': 'application/json', "location":"/"});
				res.end(JSON.stringify(error));
			});
		}
		else
			return next();
	}
};
