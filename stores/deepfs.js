if(typeof define !== 'function'){
	var define = require('amdefine')(module);
}

define(function (require){

	/**
	* todo : 
		stores: 
			mongo
				create
			sql
				create
			memory
				create
			meta-data

			cookie

			fs.image
				create
				resize
				crop
				move




			schema : 
				compilation
				readOnly
				privates
				ccs
				validation

		cache management



		aim : 

			==> by default in stores name space
			==> aka in deep.stores aka autobahnLayer.stores
			
			deep.store("mongo").create("campaign",{ host:...,port,...db:...,collection:..., schema:.... });
			==> deep("campaign::?").log();




			==> we could specify a store namespace
				==> aka role

			

			deep
			.roles("user")
			.facet("campaign", { 
				store:deep.stores.mongo( {.....} ), 
				backgrounds:[ deep.facets.restricted ] 
			})  // exactly as deep.store : but produce a facet in place of simple store
			.up({
				accessors:{
					get:{
						handler:deep.facets.permissive.get.handler
					}
				}
			})
			.flatten()
			.run("compileSchema")
			.get(...)

			equivalent : 

			var campaignLayer = {
				roles:{
					user:{
						campaign:{
							backgrounds:[deep.facets.restricted],
							store:deep.stores.mongo({.....}),
							accessors:{
								get:{
									handler:deep.facets.permissive.get.handler
								}
							}
						}
					}
				}
			}

			deep(serverLayer)
			.up(campaignLayer)
			.....
			.flatten()
			.run("compileSchema")
			.get(...)

			// negociation and routes

			deep
			.roles("user")
			.facet('campaign')
			.negociation("get", "text/html", {
				externals:{
	
				},
				treatments:{
					self:{
						....
					}
				}
			})

			//_______________ or

			deep
			//.roles("user")
			.link("/campaign/_id_/tabs/informations", {
				
			})


			deep
//____________________________________________________


Autobahn become a simple lib of stores and facets
+ session
+ a SSJS driver : analyse the request and provid a descriptor that match autobahn layer.



Autobahn  layer become deep stores layer


layer.stores = deep.stores

layer.roles = deep.roles


so : from node point of view : 

	require("deep/stores/node/mongo"); // load mongo store in deep.stores
	require("deep/stores/node/fs");	 // load fs stores (fs.text and fs.json) in deep.stores
	...

	deep.stores.json.post()

	deep
	.role("public")
	.facet("brol", {
		store:{
			backgrounds:[deep.stores.mongo],
			db:...,
			collection:...,
			host:....,
			port:....
		},
		accessors:{
			//...
		}
	})
	...


	start server ( request )

		deep
		.analyse( request ) // return request descriptor, associate with session, ...
		.run()	// run descriptor : return deep chain that catch error
		.done(function (response) 
		{	
			print response
		})
		.fail(function (error) 
		{
			print error
		});


	or simply

	require("deep-stores/node/fsjson")
	.map([ { path:"/jsons", url:"/" } ]); // statics map
	


	start server ( request )

		deep(request.pathInfos)
		.done(function  (argument) {
			// body...
		})
		.fail(function (argument) {
			// body...
		})

So, we believe in Thin Server Architecture.

Why drop pure Oriented Object approach to prefer layered aspect programation : 
Think less on the beeing of things.
Just think on what you app do.
Think about behaviours and how to modularise them.


La programmation est un art tres proche de l'écriture.
La justesse du propos, l'élégance du style, le rythme, ne pas tourner autour du pot.

Dif belle programmation/production

Malheuresement tout ca ne sert qu'à une chose : faire des app. Càd des interface pour humains, par essence et nécessité simples et limités.
Donc toute cette finesse toute cette élégance n'est la que pour produire plus facilement des choses simples.




	*/


	var fs = require("fs");
	var swig = require("swig");
return function(deep){


	deep.protocoles.fs = {
		get:function (path, options) {
			var def = deep.Deferred();
			fs.readFile(path, function(err, datas){
				if(datas instanceof Buffer)
					datas = datas.toString();
				if(err)
					def.reject(err);
				else
					def.resolve(datas);
			});
			return def.promise();
		}
	};

	deep.protocoles.htmlfs = {
		get:function (path, options) {
			options = options || {};
			return deep.protocoles.fs
			.get(path, options)
			.done(function (success) {
				return success.toString("utf8");
			});
		}
	};

	deep.protocoles.swigfs = {
		get:function (path, options) {
			options = options || {};
			return deep.protocoles.fs
			.get(path, options)
			.done(function (success) {
				//console.log("swigfs : response : ", success)
				return swig.compile(success.toString("utf8"), { filename:options.fileName || path });
			});
		}
	};

	deep.protocoles.jsonfs = {
		get:function (path, options) {
			options = options || {};
			return deep.protocoles.fs
			.get(path, options)
			.done(function (success) {
				return JSON.parse(success);
			});
		}
	};
}
});