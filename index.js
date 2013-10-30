var common = require('./lib/common.js');
var serialize = require('./lib/serialize.js');
var stdValidators = require('./lib/validators.js');


function Context(validators, aliases) {

  var self = this;

  this.validators = {};
  Object.keys(validators || {}).forEach(function(name) {
    self.addValidator(name, validators[name]);
  });

  this.aliases = {};
  Object.keys(aliases || {}).forEach(function(name) {
    self.addAlias(name, aliases[name]);
  });
}


Context.prototype.addValidator = function(name, klass) {

  this.validators[name] = klass;
  this[name] = function(/*varargs*/) {
    return new klass(this, common.cloneArgs(arguments));
  };
  return this;
};


Context.prototype.alias = function(name, validator) {

  this.aliases[name] = validator;
  this[name] = function() {
    return validator.clone(this);
  };
  return this;
};


Context.prototype.createValidator = function(schema) {

  return serialize.fromJSON(schema);
};


Context.prototype.createValue = function(validator) {

  return serialize.createValue(validator);
};


// Context.prototype.createContext = function() {
//   return new Context(this.validators, this.aliases);
// };


module.exports = function() {
  return new Context(stdValidators);
};
