
exports.middleware = function(initialiser){
	return function (req, response, next)
	{
		deep.context = { request:req };
		if(initialiser)
			deep.when(initialiser(deep.context))
			.done(function(context){
				next();
			})
			.fail(function(e){
				console.log("context middleware initialiser error : ", e.toString());
				response.writeHead(e.status || 400, {'Content-Type': 'text/html'});
				response.end("error : "+JSON.stringify(e));
			});
		else
			deep.when(deep.context)
			.done(function(){
				next();
			});
	};
};
