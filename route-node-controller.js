//route-node
/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */

if(typeof define !== 'function'){
	var define = require('amdefine')(module);
}


define(function RouteNodeControllerDefine(require){
	var Compose = require("compose");
	var deepCopy = require("deepjs/deep-copy");
	var DeepFactory = require("deepjs/deep-factory");
	var promise = require("deep/promise");

	var RouteNodeController = Compose(DeepFactory, function(){
		//console.log("RouteNodeController : constructor");
		//this.setLayerControllerGroupHandler("subs", { defaultController:"autobahn/route-node-controller", type:"object" });
		//this.setLayerControllerHandler("view-controller", { defaultController:"deep-ui/view-controller" });
	},
	{
		whenLoaded:Compose.after(function(){
			//console.log("routes node loaded : "+this.path+ " - ", JSON.stringify(this.layer, null, ' '))
		}),
		init : function(request) {
			var self = this;
			DeepRequest.html(self.html.index).then(function  (index) {
				//console.log("got index : ", index)
				jsdom.env({
				  html:index,
				  scripts: [
				    '../../www/js/jquery/jquery-1.7.1.min.js',
				    '../../www/js/jquery/jquery.address-1.4.min.js',
				    '../../www/js/jquery/jquery.cookie.js',
				    "../../www/app/ui/smartstrap/js/bootstrap-transition.js",
					"../../www/app/ui/smartstrap/js/bootstrap-alert.js",
					"../../www/app/ui/smartstrap/js/bootstrap-modal.js",
					"../../www/app/ui/smartstrap/js/bootstrap-dropdown.js",
					"../../www/app/ui/smartstrap/js/bootstrap-scrollspy.js",
					"../../www/app/ui/smartstrap/js/bootstrap-tab.js",
					"../../www/app/ui/smartstrap/js/bootstrap-tooltip.js",
					"../../www/app/ui/smartstrap/js/bootstrap-popover.js",
					"../../www/app/ui/smartstrap/js/bootstrap-button.js",
					"../../www/app/ui/smartstrap/js/bootstrap-collapse.js",
					"../../www/app/ui/smartstrap/js/bootstrap-carousel.js",
					"../../www/app/ui/smartstrap/js/bootstrap-typeahead.js",
					"../../www/app/ui/js/global.js"
				  ]
				}, function (err, window) {
					self.window = window;
				  	$ = window.jQuery;
					//
					
					self.app().then(function  (app) {
						  //console.log("app",app); // outputs Hello World
						  self.app = app;
					});

					//$('body').append("<div class='testing'>Hello World</div>");
					//console.log("BODY SCRIPTS ? ", $("body script"))
					$(".jsdom").remove();
					// console.log($("body").html()); // outputs Hello World
				});

			})
		}
	});
	RouteNodeController.prototype.layerSchema = {
		uri:"autobahn/route-node-controller",
		"backgrounds":[DeepFactory.prototype.layerSchema],
		properties:{
			subroutes:{
				subfactory:"object-group",
				defaultController:"instance::autobahn/route-node-controller"
			},
			html:{
				type:"object",
				properties:{
					index:{ type:"string", required:true }	
				}
				
			},
			appInit:{
				required:true,
				type:"any"
			},
			app:{
				required:true,
				type:"any"
			},
			window:{
				required:true,
				type:"any"
			}
		}
	}
	RouteNodeController.prototype.analyse = function(request) {
		
	}

	
	return RouteNodeController;
});