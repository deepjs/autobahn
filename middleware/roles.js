
exports.middleware = function(getRoles){

	return function (req, response, next)
	{
		if(req.session)
		{
			deep.when(getRoles(req.session))
			.done(function (roles) {
				//console.log("roles get : ", roles);
				deep.setModes({ roles:roles });
				next();
			})
			.fail(function(e){
				console.log("autobahn session middleware error : ", e.toString());
				response.writeHead(e.status || 400, {'Content-Type': 'text/html'});
				response.end("error : "+JSON.stringify(e));
			});
		}
		else
			next();
	};
};
