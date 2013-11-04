
var router = require("deep-routes/route");
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
		var items = {};
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
			.deepLoad(items.params, false)
			.done(function(success){
				//console.log("success map loaded : ", pathname, success);
				if(success.context.content && success.context.content.join)
					success.context.content = success.context.content.join("\n");
				res.writeHead(200, {'Content-Type': 'text/html', "Location":pathname});
				res.end(success.page(success.context));
			})
			.fail(function(error){
				//deep.utils.dumpError(error);
				res.writeHead(error.status || 500, {'Content-Type': 'application/json', "Location":pathname});
				res.end(JSON.stringify(error));
			});
		}
		else
			return next();
	};
};
