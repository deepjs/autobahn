/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
var deep = require("deepjs");

var urlparse = require('url').parse;
var crypto = require('crypto');
exports.middleware = function(userStore, loginField, successHandler){
	loginField = loginField || "email";
	return function (req, response, next)
	{
		//console.log("LOGIN : ", req.body);
		if(!req.body || !req.body.password || !req.body[loginField])
		{
			response.writeHead(400, {'Content-Type': 'text/html'});
			response.end("error : misformed body provided for login");
			return;
		}

		var digest = crypto.createHash('sha1').update(req.body.password).digest('hex');

		deep.store(userStore)
		.modes({ roles:"admin" })
		.get("?"+loginField+"="+encodeURIComponent(req.body[loginField])+"&password="+digest)
		.done(function(success){
			//console.log("login get : ", success);
			success = success.shift();
			delete success.password;
			req.session.user = success;
			if(successHandler)
				deep.when(successHandler(success))
				.done(function(success){
					response.writeHead(200, {'Content-Type': 'application/json'});
					response.end(JSON.stringify(success));
				});
			else
			{
				response.writeHead(200, {'Content-Type': 'application/json'});
				response.end(JSON.stringify(success));
			}
		})
		.fail(function(error){
			response.writeHead(error.status || 400, {'Content-Type': 'text/html'});
			response.end("error : login failed");
		});
	};
};
