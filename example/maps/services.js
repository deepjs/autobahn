/**
 * example of deep-views/deep-routes html render map
 */
var deep = require("deepjs");
require("deep-mongo");
require("autobahnjs/lib/utils"); /// load deep.transformers.Hash

module.exports = {
	"/user": deep.ocm({
		dev: deep.Collection(null, [{ id:"e1", email:"john@doe.com", password:deep.utils.Hash("test1234") }]),
		prod: deep.Mongo(null, "mongodb://127.0.0.1:27017/yourdb", "user"),
		admin:{
			schema:{
				properties:{
					email:{ type:"string", format:"email", required:true },
					password:{ type:"string", minLength:6, required:true, transformer:deep.transformers.Hash, "private":true }
				}
			}
		},
		user: {
			_backgrounds: ["this::../admin", deep.AllowOnly("get")],
			schema:{
				ownerRestriction:"id", // user could only see his own user object.
				properties:{
					email:{ readOnly:true },
					password:{ readOnly:true }
				}
			}
		},
		"public": {
			// nothing to do
		}
	}, {
		protocol: "user",
		sensibleTo: ["env","roles"]
	}),
	"/foo":deep.Collection("foo", [{ id:"e1", bar:true, zoo:"hello world" }])
};
