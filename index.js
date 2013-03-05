//
// joskito - json schema validation
//

var _ = require('underscore');


var messages = {
  'type': 'Value is not of type <%=type%>.',
  'unknownType': 'Type is not known <%=type%>.',
  'unionTypeNotValid': 'Failed to validate union types.',
  'allOf': 'Value failed to validate against all of the schemas',
  'anyOf': 'Value failed to validate against any of the schemas',
  'oneOf': 'Value failed to validate against at least one of the schemas',
  'notOneOf': 'Value failed to validate against not one schema',
  'enum': 'Invalid enum value <%=value%>.',
  // string
  'pattern': 'String does not match pattern <%=pattern%>.',
  'format': 'String is not a valid <%=format%>',
  'unknownFormat': 'Format <%=format%> is unkown',
  'minLength': 'String has to be at least <%=minLength%> characters long.',
  'maxLength': 'String should not be longer than <%=maxLength%> characters.',
  // number
  'minimum': 'Number is less than minimum <%=minimum%>.',
  'maximum': 'Number is greater than maximum <%=maximum%>.',
  'exclusiveMinimum': 'Number is less than or equal to exclusive minimum <%=exclusiveMinimum%>.',
  'exclusiveMaximum': 'Number is greater than or equal to exclusive maximum <%=exclusiveMaximum%>.',
  'multipleOf': 'Number should be a multiple of <%=multipleOf%>',
  // object
  'minProperties': 'Object should have at least <%=minProperties%> properties.',
  'maxProperties': 'Object should have not more than <%=maxProperties%> properties.',
  'dependency': 'Property does not meet dependency.',
  'dependencyNoProp': 'Property of dependency does not exist.',
  'required': 'Required property <%=property%> does not exist.',
  'properties': 'Property is missing.',
  'propertyNotValid': 'Property not valid against any property schema.',
  'additionalPropertiesFalse': 'Additional property is allowed.',
  // array
  'minItems': 'Array should have at least <%=minItems%> items.',
  'maxItems': 'Array should not have more than <%=maxItems%> items.',
  'uniqueItems': 'Array is not unique.',
  'tuple': 'Item is missing from tuple.',
  'additionalItems': 'Additional items are not allowed',
  'itemNotValid': 'Item is not valid'
};


var formats = {
  // originally taken from https://github.com/flatiron/revalidator/
  'email': /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i,
  'ip-address': /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/i,
  'ipv6': /^([0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}$/,
  'date-time': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:.\d{1,3})?Z$/,
  'date': /^\d{4}-\d{2}-\d{2}$/,
  'time': /^\d{2}:\d{2}:\d{2}$/,
  'color': /^#[a-z0-9]{6}$|^#[a-z0-9]{3}$|^(?:rgba?\(\s*(?:[+-]?\d+%?)\s*,\s*(?:[+-]?\d+%?)\s*,\s*(?:[+-]?\d+%?)\s*(?:,\s*(?:[+-]?\d+%?)\s*)?\))$/i,
  //'style': (not supported)
  //'phone': (not supported)
  //'uri': (not supported)
  'host-name': /^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])/,
  'utc-millisec': /^\d+$/,
  'regex': {
	test: function (value) {
	  try { var re = new RegExp(value); }
	  catch (e) { return false }
	  return true;
	}
  },
  // non standard
  url: /\(?\b(?:(http|https):\/\/)?((?:www.)?[a-zA-Z0-9\-\.]+[\.][a-zA-Z]{2,4})(?::(\d*))?(?=[\s\/,\.\)])([\/]{1}[^\s\?]*[\/]{1})*(?:\/?([^\s\n\?\[\]\{\}\#]*(?:(?=\.)){1}|[^\s\n\?\[\]\{\}\.\#]*)?([\.]{1}[^\s\?\#]*)?)?(?:\?{1}([^\s\n\#\[\]\(\)]*))?([\#][^\s\n]*)?\)?/
};


var error = function(path, msgId, msgData) {
  var msg = _.template(messages[msgId], msgData || {});
  return { path: path, message: msg };
};


var mutConcat = function(a, b) {
  _.each(b, function() { a.push(b); });
};


var validators = {
  'string': function(schema, string, path, errors, options) {
	if (!_.isString(string)) {
	  errors.push(error(path, 'type', schema));
	}
	if (schema.pattern && !(new RegExp(schema.pattern)).test(string)) {
	  errors.push(error(path, 'pattern', {pattern: '/' + schema.pattern + '/'}));
	  return;
	}
	if (schema.format && options.validateFormat) {
	  if (!formats[schema.format]) {
		errors.push(error(path, 'unknownFormat', schema));
	  }
	  else if (!formats[schema.format].test(string)) {
		errors.push(error(path, 'format', schema));
	  }
	}
	if (schema.hasOwnProperty('minLength') && string.length < schema.minLength) {
	  errors.push(error(path, 'minLength', schema));
	}
	if (schema.hasOwnProperty('maxLength') && string.length > schema.maxLength) {
	  errors.push(error(path, 'maxLength', schema));
	}
  },

  
  'number': function(schema, number, path, errors, options) {
	if (!_.isNumber(number)) {
	  errors.push(error(path, 'type', schema));
	  return;
	}
	if (schema.hasOwnProperty('minimum')) {
	  if (schema.exclusiveMinimum && number <= schema.minimum) {
		errors.push(error(path, 'exclusiveMinimum', schema));
	  }
	  else if (number < schema.minimum) {
		errors.push(error(path, 'minimum', schema));
	  }
	}
	if (schema.hasOwnProperty('maximum')) {
	  if (schema.exclusiveMaximum && number >= schema.maximum) {
		errors.push(error(path, 'exclusiveMaximum', schema));
	  }
	  else if (number > schema.maximum) {
		errors.push(error(path, 'maximum', schema));
	  }
	}
	if (schema.hasOwnProperty('multipleOf') && number % schema.multipleOf !== 0) {
	  errors.push(error(path, 'multipleOf', schema));
	}
  },

  
  'integer': function(schema, integer, path, errors, options) {
	if (!_.isNumber(integer)) {
	  errors.push(error(path, 'type', schema));
	  return;
	}
	if (Math.ceil(integer) !== integer) {
	  errors.push(error(path, 'type', schema));
	}
	validators['number'](schema, integer, path, errors, options);
  },

  
  'boolean': function(schema, bool, path, errors, options) {
	if (!_.isBoolean(bool)) {
	  errors.push(error(path, 'type', schema));
	}
  },

  
  'object': function(schema, object, path, errors, options) {
	if (!_.isObject(object) || _.isArray(object)) {
	  errors.push(error(path, 'type', schema));
	  return;
	}

	// min/max
	if (schema.minProperties && _.keys(object).length < schema.minProperties) {
	  errors.push(error, 'minProperties', schema);
	}
	if (schema.maxProperties && _.keys(object).length > schema.maxProperties) {
	  errors.push(error, 'maxProperties', schema);
	}
	
	// check dependencies
	if (schema.dependencies) {
	  _.each(schema.dependencies, function(dependency, key) {
		if (!object.hasOwnProperty(key)) {
		  errors.push(error(path + '.' + key, 'dependencyNoProp'));
		}
		if (_.isArray(dependency)) {
		  // validate property name array dependency
		  _.each(dependency, function(depProp) {
			if (!object.hasOwnProperty(depProp)) {
			  errors.push(error(path + '.' + key, 'dependency'));
			}
		  });
		}
		else if (_.isObject(dependency)) {
		  // validate schema dependency
		  validate(dependency, object, path, errors, options);
		}
	  });
	}

	// check required
	if (schema.required) {
	  _.each(schema.required, function(reqProp) {
		if (!object.hasOwnProperty(reqProp)) {
		  errors.push(error(path + '.' + reqProp, 'required', {property: reqProp}));
		}
	  });
	}

	var pattern = schema.patternProperties ? _.keys(schema.patternProperties) : [];
	var additionalAllowed = options.additionalProperties;
	if (schema.hasOwnProperty('additionalProperties')) {
	  additionalAllowed = !!schema.additionalProperties;
	}
	
	// validate properties, additionalProperties and patternProperties
	_.each(object, function(value, key) {
	  // check properties
	  if (schema.properties && schema.properties[key]) {
		validate(schema.properties[key], value, path + '.' + key, errors, options);
		return;
	  }
	  // check pattern properties
	  for (var i = 0; i < pattern.length; ++i) {
		if (key.match(new RegExp(pattern[i]))) {
		  validate(schema.patternProperties[pattern[i]], value, path, errors, options);
		  return;
		}
	  }
	  // check additional properties
	  if (!additionalAllowed) {
		errors.push(error(path + '.' + key, 'additionalPropertiesFalse'));
	  }
	  else if (schema.additionalProperties && schema.additionalProperties[key]) {
		validate(schema.additionalProperties[key], value, path + '.' + key, errors, options);
	  }
	});
  },

  
  'array': function(schema, array, path, errors, options) {
	if (!_.isArray(array)) {
	  errors.push(error(path, 'type', 'array'));
	  return;
	}

	// check min/max
	if (schema.hasOwnProperty('minItems') && array.length < schema.minItems) {
	  errors.push(error(path, 'minItems', schema));
	}
	if (schema.hasOwnProperty('maxItems') && array.length > schema.maxItems) {
	  errors.push(error(path, 'maxItems', schema));
	}

	// test if array only contains unique items
	if (schema.uniqueItems) {
	  var cache = {};
	  _.each(array, function(item, i) {
		var str = JSON.stringify(item);
		if (cache[str]) {
		  errors.push(error(path, 'uniqueItems'));
		  return;
		}
		cache[str] = true;
	  });
	}
	
	// validate items and additionalItems
	if (schema.items && !_.isArray(schema.items)) {
	  _.each(array, function(item, i) {
		var errs = [];
		validate(schema.items, item, path + '[' + i + ']', errs, options);
		if (errs.length === 0) {
		  return;
		}
		
		if (schema.hasOwnProperty('additionalItems')
			|| !options.additionalItems) {
		  if (_.isObject(schema.additionalItems)) {
			// validate against additional items
			var addErrs = [];
			validate(schema.additionalItems, item, path + '[' + i + ']', addErrs, options);
			if (addErrs.length > 0) {
			  // show errors from items
			  mutConcat(errors, errs);
			}
		  }
		  else if (!schema.additionalItems || !options.additionalItems) {
			// no additional items allowed
			mutConcat(errors, errs);
		  }
		}
	  });
	}

	if (schema.items && _.isArray(schema.items)) {
	  return; // TODO: implement tuple typing
	}
  },

  
  'null': function(schema, value, path, errors, options) {
	if (value !== null) {
	  errors.push(error(path, 'type', schema));
	}
  },

  
  'any': function(schema, value, path, errors, options) {
  },

  
  'allOf': function(schema, value, path, errors, options) {
	_.each(schema.allOf, function(schema) {
	  validate(schema, value, path, errors, options);
	});
  },


  'anyOf': function(schema, value, path, errors, options) {
	var valid = false;
	_.each(schema.anyOf, function(schema) {
	  var localErrors = [];
	  validate(schema, value, path, localErrors, options);
	  valid = localErrors.length === 0 ? true : valid;
	});
	if (!valid) {
	  errors.push(error(path, 'anyOf'));
	}
  },

  
  'oneOf': function(schema, value, path, errors, options) {
	var numValid = 0;
	_.each(schema.oneOf, function(schema) {
	  var localErrors = [];
	  validate(schema, value, path, localErrors, options);
	  if (localErrors.length === 0) numValid++;
	});
	if (numValid === 0) {
	  errors.push(error(path, 'notOneOf'));
	}
	if (numValid > 1) {
	  errors.push(error(path, 'oneOf'));
	}
  },

  
  'type': function(schema, value, path, errors, options) {
	if (_.isArray(schema.type)) {
	  // union type
	  var valid = false;
	  _.each(schema.type, function(type) {
		if (validators[type]) {
		  var localErrors = [];
		  validators[type](schema, value, path, localErrors, options);
		  if (localErrors.length === 0) {
			valid = true;
			return;
		  }
		}
		else {
		  errors.push(path, 'unknownType', {type: type});
		}
	  });
	  if (!valid) {
		errors.push(path, 'unionTypeNotValid');
	  }
	}
	else {
	  // simple type
	  if (validators[schema.type]) {
		validators[schema.type](schema, value, path, errors, options);
	  }
	  else {
		errors.push(path, 'unknownType', schema);
	  }
	}
  }
};


var validate = function(schema, value, path, errors, options) {
  if (!schema) {
	return;
  }
  // if (schema.$ref) {
  // 	if (schemas[schema.$ref]) {
  // 		// TODO: replace schema at this point with schema from reference
  //      _.extend(schema, subSchema);
  // 	}
  // 	else {
  // 		errors.push(error(path, 'Could not resolve schema ' + schema.$ref));
  // 	}
  // }

  // infer type
  if (!schema.type) {
	if (schema.properties) {
	  schema.type = 'object';
	}
	else if (schema.items) {
	  schema.type = 'array';
	}
  }
  

  // check enum
  if (schema.enum) {
	if (schema.enum && schema.enum.indexOf(value) === -1) {
	  errors.push(error(path, 'enum', {value: value}));
	}
  }

  if (schema.oneOf) {
	validators.oneOf(schema, value, path, errors, options);
  }
  else if (schema.allOf) {
	validators.allOf(schema, value, path, errors, options);
  }
  else if (schema.anyOf) {
	validators.anyOf(schema, value, path, errors, options);
  }
  else if (schema.type) {
	validators.type(schema, value, path, errors, options);
  }
};


// expose validate
module.exports = function(schema, data, options) {
  var errors = [],
	  defaultOptions = {
		validateFormat: false,
		additionalProperties: true,
		additionalItems: true
	  };
  
  validate(schema, data, '', errors, _.extend(defaultOptions, options));

  return {
	valid: errors.length === 0,
	errors: errors
  };
};
