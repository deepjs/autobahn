if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(function FacetControllerDefine(require){

			var deep = require("deep/deep");
				var promised = require("promised-io/promise");

	return {
		tests:{
			a:function  (argument) {
				return deep(1).done(function (argument) {
					var def = promised.Deferred();
					setTimeout(function (argument) {
						def.resolve("yeah");
					},1000)
					return promised.when(def).done(function (argument) {
						return "roooo";
					})
				})
				.done(function (res) {
					console.assert(res === "roooo");
					return res === "roooo";
				})
			}
		},
		run:function () {
			var report = {
				success:[],
				error:[],
				total:0,
				valid:true
			}
			for(var i in this.tests)
			{
				report.total++;
				var t = { name:i };
				try{
					deep.when(this.tests[i]())
					.done(function (res) {
						t.result = res;
						console.log("test "+i+" result : ", t.result);
						if(t.result === true)
							report.success.push(t);
						else
							report.error.push(t);
					})
					.fail(function (error) {
						// body...
						t.result = error;
						report.error.push(t);
					})
					
				}
				catch(e)
				{
					t.result = e;
					report.error.push(t);
				}
			}
			report.valid = report.error.length === 0;
			return report;
		}
	}

})