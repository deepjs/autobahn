if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(function FacetControllerDefine(require){

	var deep = require("deep/deep");
	var promised = require("promised-io/promise");
	var MongoDB = require("perstore/store/mongodb").MongoDB;
	var	store = MongoDB({url:"mongodb://127.0.0.1:27017/push", collection: "user"});
	 
	return {
		promisedio1:function  () 
		{
			return deep(1)
			.done(function (argument) {
				var def = promised.Deferred();
				setTimeout(function (argument) {
					def.resolve("yeah");
				},1000)
				return promised.when(def).done(function (argument) {
					return "roooo";
				})
			})
			.done(function (res) {
				console.log(res === "roooo");
				return res === "roooo";
			});
		},
		mongo:function  (id) 
		{
			return deep.when(store.query("id="+id, {}))
			.then(function (success) {
				console.log("success : ", success);
				return "roooo";
			})
			.done(function (res) {
				console.log(res === "roooo");
				return res === "roooo";
			});
		},
		mongo2:function  (id) 
		{
			return deep(store.get(id, {}))
			.done(function (success) {
				console.log("success : ", success);
				return "roooo";
			})
			.done(function (res) {
				console.log(res === "roooo");
				return res === "roooo";
			});
		}
	}
});






/*

define(function (require) {
	var redirect = require("pintura/jsgi/redirect");
//...

get:{
	handler:function (id, options) {
		return deep(this.facet.store.get(id, options))
		.fail(function (argument) {
			throw new errors.Unauthorized(); // si tu veux masquer l'erreur. sinon tu ne mets pas de fail
		})
		.done(function (res) {
			if(res.success )
				return redirect.Redirect("uri_de_success")(deep.context.request);
			return redirect.Redirect("uri_d_erreur")(deep.context.request);
			
		})
	}
}

*/