
var urlparse = require('url').parse;
var crypto = require('crypto');
exports.middleware = function(userStore, loginField){
	loginField = loginField || "email";
	return function (req, response, next)
	{
		//console.log("login : ", req.body);
		var shasum = crypto.createHash('sha1');
		deep.store(userStore)
		.modes({ roles:"admin" })
		.get("?"+loginField+"="+encodeURIComponent(req.body[loginField]))
		.done(function(success){
			//console.log("login get : ", success);
			success = success.shift();
			shasum.update(req.body.password);
			var digest = shasum.digest('hex');
			//console.log("pass : ", success.password, " - ", digest)
			if(success.password === digest)
			{
				delete success.password;
				req.session.user = success;
				response.writeHead(200, {'Content-Type': 'application/json'});
				response.end(JSON.stringify(success));
			}
			else
				return deep.errors.Login("login failed");
		})
		.fail(function(error){
			response.writeHead(error.status || 400, {'Content-Type': 'text/html'});
			response.end("error : login failed");
		});
	};
};
