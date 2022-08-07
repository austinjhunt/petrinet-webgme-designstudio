"use strict";

var config = require("./config.webgme"),
  validateConfig = require("webgme/config/validator");

// Add/overwrite any additional settings here
config.server.port = 8080;
// config.mongo.uri = 'mongodb://127.0.0.1:27017/webgme_my_app';

//allowing python plugin execution
config.plugin.allowServerExecution = true;

// Paths needed for proper jointjs import on the client side
config.requirejsPaths["jointjs"] = "./node_modules/jointjs/dist/joint.min";
config.requirejsPaths["lodash"] = "./node_modules/lodash/lodash.min";

validateConfig(config);
module.exports = config;
