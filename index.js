//
// joskito - json schema validation
//

var _ = require('underscore');


var messages = {
  'type': 'Value is not of type <%=type%>.',
  'unknownType': 'Type is not known <%=type%>.',
  'unionTypeNotValid': 'Failed to validate union types.',
  // string
  'enum': 'Invalid enum value <%=value%>.',
  'pattern': 'String does not match pattern <%=pattern%>.',
  'minLength': 'String has to be at least <%=minLength%> characters long.',
  'maxLength': 'String should not be longer than <%=maxLength%> characters.',
  // number
  'minimum': 'Number is less than minimum <%=minimum%>.',
  'maximum': 'Number is greater than maximum <%=maximum%>.',
  'exclusiveMinimum': 'Number is less than or equal to exclusive minimum <%=exclusiveMinimum%>.',
  'exclusiveMaximum': 'Number is greater than or equal to exclusive maximum <%=exclusiveMaximum%>.',
  // object
  'dependency': 'Property does not meet dependency.',
  'dependencyNoProp': 'Property of dependency does not exist.',
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
  'color': /^#[a-z0-9]{6}|#[a-z0-9]{3}|(?:rgba?\(\s*(?:[+-]?\d+%?)\s*,\s*(?:[+-]?\d+%?)\s*,\s*(?:[+-]?\d+%?)\s*(?:,\s*(?:[+-]?\d+%?)\s*)?\))|aqua|black|blue|fuchsia|gray|green|lime|maroon|navy|olive|orange|purple|red|silver|teal|white|yellow$/i,
  //'style': (not supported)
  //'phone': (not supported)
  //'uri': (not supported)
  'host-name': /^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])/,
  'utc-millisec': {
	test: function (value) {
	  return _.isNumber(value) && value >= 0;
	}
  },
  'regex': {
	test: function (value) {
	  try { new RegExp(value) }
	  catch (e) { return false }
	  return true;
	}
  },
  // non standard
  url: /\(?\b(?:(http|https):\/\/)?((?:www.)?[a-zA-Z0-9\-\.]+[\.][a-zA-Z]{2,4})(?::(\d*))?(?=[\s\/,\.\)])([\/]{1}[^\s\?]*[\/]{1})*(?:\/?([^\s\n\?\[\]\{\}\#]*(?:(?=\.)){1}|[^\s\n\?\[\]\{\}\.\#]*)?([\.]{1}[^\s\?\#]*)?)?(?:\?{1}([^\s\n\#\[\]\(\)]*))?([\#][^\s\n]*)?\)?/
};


var error = function(path, msgId, msgData) {
  var msg = _.template(messages[msgId], msgData || {});
  console.log(msg);
  return { path: path, message: msg };
};


var validators = {
  'string': function(schema, string, path, errors) {
	if (!_.isString(string)) {
	  errors.push(error(path, 'type', schema));
	}
	if (schema.enum && schema.enum.indexOf(string) === -1) {
	  errors.push(error(path, 'enum', {value: string}));
	}
	if (schema.pattern && !(new RegExp(schema.pattern)).test(string)) {
	  errors.push(error(path, 'pattern', {pattern: '/' + schema.pattern + '/'}));
	  return;
	}
	if (schema.hasOwnProperty('minLength') && string.length < schema.minLength) {
	  errors.push(error(path, 'minLength', schema));
	}
	if (schema.hasOwnProperty('maxLength') && string.length > schema.maxLength) {
	  errors.push(error(path, 'maxLength', schema));
	}
  },

  
  'number': function(schema, number, path, errors) {
	if (!_.isNumber(number)) {
	  errors.push(error(path, 'type', schema));
	  return;
	}
	if (schema.hasOwnProperty('minimum') && number < schema.minimum) {
	  errors.push(error(path, 'minimum', schema));
	}
	if (schema.hasOwnProperty('maximum') && number > schema.maximum) {
	  errors.push(error(path, 'maximum', schema));
	}
	if (schema.hasOwnProperty('exclusiveMinimum') && number <= schema.exclusiveMinimum) {
	  errors.push(error(path, 'exclusiveMinimum', schema));
	}
	if (schema.hasOwnProperty('exclusiveMaximum') && number >= schema.exclusiveMaximum) {
	  errors.push(error(path, 'exclusiveMaximum', schema));
	}
  },

  
  'integer': function(schema, integer, path, errors) {
	if (!_.isNumber(integer)) {
	  errors.push(error(path, 'type', schema));
	  return;
	}
	if (Math.ceil(integer) !== integer) {
	  errors.push(error(path, 'type', schema));
	}
	validators['number'](schema, integer, path, errors);
  },

  
  'boolean': function(schema, bool, path, errors) {
	if (!_.isBoolean(bool)) {
	  errors.push(error(path, 'type', schema));
	}
  },

  
  'object': function(schema, object, path, errors) {
	if (!_.isObject(object) || _.isArray(object)) {
	  errors.push(error(path, 'type', schema));
	  return;
	}
	var pattern = schema.patternProperties ? _.keys(schema.patternProperties) : [];
	var additionalAllowed = !(schema.hasOwnProperty('additionalProperties')
							  && !schema.additionalProperties);

	// check dependencies
	if (schema.dependencies) {
	  var checkDep = function(object, key, dependency) {
		if (_.isString(dependency)) {
		  // simple dependency
		  if (object.hasOwnProperty(key) && !object.hasOwnProperty(dependency)) {
			errors.push(error(path + '.' + key, 'dependency'));
		  }
		}
		else if (_.isArray(dependency)) {
		  // array of dependencies, recurse
		  _.each(dependency, function(dep) {
			checkDep(object, key, dep);
		  });
		}
		else if (_.isObject(dependency)) {
		  // schema dependency
		  validate(dependency, object, path, errors);
		}
	  };
	  
	  _.each(schema.dependencies, function(dependency, key) {
		if (!object.hasOwnProperty(key)) {
		  errors.push(error(path + '.' + key, 'dependencyNoProp'));
		}
		else checkDep(object, key, dependency);
	  });
	}

	// check regular properties
	if (schema.properties) {
	  _.each(schema.properties, function(subSchema, key) {
		var subPath = path + '.' + key;
		
		if (object.hasOwnProperty(key)) {
		  validate(subSchema, object[key], subPath, errors);
		}
		else if (subSchema.required) {
		  errors.push(error(subPath, 'properties'));
		}
	  });
	}

	// check additional-, pattern- and superfluous-properties
	_.each(object, function(value, key) {
	  if (schema.properties && schema.properties[key]) {
		// we already checked these
		return;
	  }
	  var subPath = path + '.' + key;
	  
	  if (!additionalAllowed) {
		errors.push(error(subPath, 'additionalPropertiesFalse'));
		return;
	  }
	  if (schema.additionalProperties || schema.patternProperties) {
		// property has to validate against either additional schema or pattern schema
		if (schema.additionalProperties && schema.additionalProperties[key]) {
		  validate(schema.additionalProperties[key], value, subPath, errors);
		  return;
		}
		// check pattern
		if (schema.patternProperties) {
		  for (var i = 0; i < pattern.length; ++i) {
			if (key.match(new RegExp(pattern[i]))) {
			  validate(schema.patternProperties[pattern[i]], value, path, errors);
			  return;
			}
		  }
		}
		// no schema with instance name found
		errors.push(error(subPath, 'propertyNotValid'));
	  }
	});
  },

  
  'array': function(schema, array, path, errors) {
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
	
	// validate single item-schema array
	if (schema.items && !_.isArray(schema.items)) {
	  _.each(array, function(item, i) {
		validate(schema.items, item, path + '[' + i + ']', errors);
	  });
	  return;
	}

	// validate array tuple schema
	var i = 0;
	if (schema.items && _.isArray(schema.items)) {
	  for (i = 0; i < schema.items.length; ++i) {
		subPath = '[' + i + ']';
		if (i < array.length) {
		  validate(schema.items[i], array[i], subPath, errors);
		}
		else {
		  errors.push(error(subPath), 'tuple');
		  continue;
		}
	  }
	}

	if (i === array.length) {
	  // all items validated or array is empty
	  return;
	}

	// check if no additional items are allowed
	if (schema.hasOwnProperty('additionalItems') && !schema.additionalItems) {
	  errors.push(error(path, 'additionalItems'));
	  return;
	}

	// validate additional items
	if (schema.additionalItems) {
	  // validate single-schema additional items
	  if (!_.isArray(schema.additionalItems)) {
		// continue loop in case i is greater than zero
		for(; i < array.length; ++i) {
		  validate(schema.additionalItems, array[i], path + '[' + i + ']', errors);
		}
	  }
	  else {
		// validate against an array of additional schemas
		for(; i < array.length; ++i) {
		  var subPath = '[' + i + ']';
		  var isValid = false;
		  _.each(schema.additionalItems, function(subSchema) {
			var errs = [];
			validate(subSchema, array[i], subPath, errs);
			isValid = errs.length === 0 ? true : isValid;
		  });
		  if (!isValid) {
			errors.push(error(subPath, 'itemNotValid'));
		  }
		}
	  }
	}
  },

  
  'null': function(schema, value, path, errors) {
	if (value !== null) {
	  errors.push(error(path, 'type', schema));
	}
  },

  
  'any': function(schema, value, path, errors) {
  }
};


var validate = function(schema, data, path, errors) {
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

  // infer object type
  if (!schema.type && schema.properties) {
	schema.type = 'object';
  }
  
  if (schema.type) {
	if (_.isArray(schema.type)) {
	  // union type
	  var valid = false;
	  _.each(schema.type, function(type) {
		if (validators[type]) {
		  var localErrors = [];
		  validators[type](schema, data, path, localErrors);
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
		validators[schema.type](schema, data, path, errors);
	  }
	  else {
		errors.push(path, 'unknownType', schema);
	  }
	}
  }
};


// expose validate
module.exports = function(schema, data) {
  var errors = [];
  validate(schema, data, '', errors);

  return {
	valid: errors.length === 0,
	errors: errors
  };
};
