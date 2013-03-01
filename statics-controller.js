//statics factory
/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */

if(typeof define !== 'function'){
	var define = require('amdefine')(module);
}


define(function RouteNodeControllerDefine(require){
var deep = require("deep/deep");
	var Compose = require("compose");
	var deepCopy = require("deep/deep-copy");
	var DeepFactory = require("deep/deep-factory");
	var promise = require("deep/promise");
	var StaticsController = Compose(DeepFactory, function(){
		//console.log("RouteNodeController : constructor");
		//this.setLayerControllerGroupHandler("subs", { defaultController:"autobahn/route-node-controller", type:"object" });
		//this.setLayerControllerHandler("view-controller", { defaultController:"deep-ui/view-controller" });
	},
	{
		whenLoaded:Compose.after(function(){
			//console.log("routes node loaded : "+this.path+ " - ", JSON.stringify(this.layer, null, ' '))
		})
	});
	StaticsController.prototype.layerSchema = {
		uri:"autobahn/statics-controller",
		"backgrounds":[DeepFactory.prototype.layerSchema],
		properties:{
			entries:{
				type:"array",
				merge:"root",
				loadable:"none",
				"interpretation-deepness":"none",
				items:{
					properties:{
						urls:{
							required:true,
							type:"array", merge:true, items:{ type:"string" }
						},
						cachePolicy:{
							required:false
							patternProperties:{
								/.*/gi:{ type:"integer" }
							}
						},
						root:{
							required:true,
							type:"string"
						},
						directoryListing:{
							required:true,
							type:"boolean"
						},
						index:{
							type:"string",
							"defaiult":"index.html"
							required:false
						}
					}
				}
			}
		}
	}
	StaticsController.prototype.analyse = function(request) {
		
	}
	return StaticsController;
});