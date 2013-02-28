//
// joskito - json schema validation
//

var util = require('util');


var messages = {
  'type': 'Value is not of type %s.',
  // string
  'pattern': 'String does not match pattern %s.',
  'minLength': 'String has to be at least %d characters long.',
  'maxLength': 'String should not be longer than %d characters.',
  // number
  'minimum': 'Number is less than minimum %d.',
  'maximum': 'Number is greater than maximum %d.',
  'exclusiveMinimum': 'Number is less than or equal to exclusive minimum %d.',
  'exclusiveMaximum': 'Number is greater than or equal to exclusive maximum %d.',
  // object
  'dependency': 'Property does not meet dependency.',
  'dependencyNoProp': 'Property of dependency does not exist.',
  'properties': 'Property is missing.',
  'propertyNotValid': 'Property not valid against any property schema.',
  'additionalPropertiesFalse': 'Additional property is allowed.',
  // array
  'minItems': 'Array should have at least %d items.',
  'maxItems': 'Array should not have more than %d items.',
  'uniqueItems': 'Array is not unique. Duplicate item at %d.',
  'tuple': 'Item is missing from tuple.',
  'additionalItems': 'Additional items are not allowed',
  'itemNotValid': 'Item is not valid'
};


var error = function(path, msgId /*, msgArgs...*/) {
  var msgTmpl = messages[msgId],
	  msgArgs = [msgTmpl].concat(Array.prototype.slice.call(arguments, 2)),
	  msg = util.format.apply(util, msgArgs);
	  
  console.log(msg);
  return { path: path, message: msg };
};


var isArray = function(a) {
  return Object.prototype.toString.call(a) === '[object Array]';
};


var validators = {
  'string': function(schema, string, path, errors) {
	if (typeof string !== 'string') {
	  errors.push(error(path, 'type', 'string'));
	}
	if (schema.pattern && !(new RegExp(schema.pattern)).test(string)) {
	  errors.push(error(path, 'pattern', '/' + schema.pattern + '/'));
	}
	if (schema.hasOwnProperty('minLength') && string.length < schema.minLength) {
	  errors.push(error(path, 'minLength', schema.minLength));
	}
	if (schema.hasOwnProperty('maxLength') && string.length > schema.maxLength) {
	  errors.push(error(path, 'maxLength', schema.maxLength));
	}
  },
  
  'number': function(schema, number, path, errors) {
	if (typeof number !== 'number') {
	  errors.push(error(path, 'wrong type', 'number'));
	  return;
	}
	if (schema.hasOwnProperty('minimum') && number < schema.minimum) {
	  errors.push(error(path, 'minimum', schema.minimum));
	}
	if (schema.hasOwnProperty('maximum') && number > schema.maximum) {
	  errors.push(error(path, 'maximum', schema.maximum));
	}
	if (schema.hasOwnProperty('exclusiveMinimum') && number <= schema.exclusiveMinimum) {
	  errors.push(error(path, 'exclusiveMinimum', schema.exclusiveMinimum));
	}
	if (schema.hasOwnProperty('exclusiveMaximum') && number >= schema.exclusiveMaximum) {
	  errors.push(error(path, 'exclusiveMaximum', schema.exclusiveMaximum));
	}
  },
  
  'integer': function(schema, value, path, errors) {
	if (typeof value !== 'number') {
	  errors.push(error(path, 'type', 'integer'));
	  return;
	}
	if (Math.ceil(value) !== value) {
	  errors.push(error(path, 'type', 'integer'));
	}
	validators['number'](schema, value, path, errors);
  },

  'boolean': function(schema, value, path, errors) {
	if (typeof value !== 'boolean') {
	  errors.push(error(path, 'type', 'boolean'));
	}
  },
  
  'object': function(schema, object, path, errors) {
	if (typeof object !== 'object' || isArray(object)) {
	  errors.push(error(path, 'type', 'object'));
	  return;
	}
	var pattern = schema.patternProperties ? Object.keys(schema.patternProperties) : [];
	var additionalAllowed = !(schema.hasOwnProperty('additionalProperties')
							  && !schema.additionalProperties);

	//
	// check dependencies
	//
	if (schema.dependencies) {
	  var checkDep = function(object, key, dependency) {
		if (typeof dependency === 'string') {
		  // simple dependency
		  if (object.hasOwnProperty(key) && !object.hasOwnProperty(dependency)) {
			errors.push(error, path + '.' + key, 'dependency');
		  }
		}
		else if (isArray(dependency)) {
		  // array of dependencies, recurse
		  dependency.forEach(function(dep) {
			checkDep(object, key, dep);
		  });
		}
		else if (typeof dependency === 'object') {
		  // schema dependency
		  validate(dependency, object, path, errors);
		}
	  };
	  
	  Object.keys(schema.dependencies).forEach(function(key) {
		if (!object.hasOwnProperty(key)) {
		  errors.push(error(path + '.' + key, 'dependencyNoProp'));
		}
		else checkDep(object, key, schema.dependencies[key]);
	  });
	}

	//
	// check regular properties
	//
	if (schema.properties) {
	  Object.keys(schema.properties).forEach(function(key) {
		var subPath = path + '.' + key,
			subSchema = schema.properties[key];
		
		if (object.hasOwnProperty(key)) {
		  validate(schema.properties[key], object[key], subPath, errors);
		}
		else if (subSchema.required) {
		  errors.push(error(subPath, 'properties'));
		}
	  });
	}

	//
	// check additional-, pattern- and superfluous-properties
	//
	Object.keys(object).forEach(function(key) {
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
		  validate(schema.additionalProperties[key], object[key], subPath, errors);
		  return;
		}
		// check pattern
		if (schema.patternProperties) {
		  for (var i = 0; i < pattern.length; ++i) {
			if (key.match(new RegExp(pattern[i]))) {
			  validate(schema.patternProperties[pattern[i]], object[key], path, errors);
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
	if (!isArray(array)) {
	  errors.push(error(path, 'type', 'array'));
	  return;
	}
	// check min/max
	if (schema.hasOwnProperty('minItems') && array.length < schema.minItems) {
	  errors.push(error(path, 'minItems', schema.minItems));
	}
	if (schema.hasOwnProperty('maxItems') && array.length > schema.maxItems) {
	  errors.push(error(path, 'maxItems', schema.maxItems));
	}

	//
	// test if array only contains unique items
	//
	if (schema.uniqueItems) {
	  var cache = {};
	  array.forEach(function(item, i) {
		var str = JSON.stringify(item);
		if (cache[str]) {
		  errors.push(error(path, 'uniqueItems', i));
		  return;
		}
		cache[str] = true;
	  });
	}
	
	//
	// validate single item-schema array
	//
	if (schema.items && !isArray(schema.items)) {
	  array.forEach(function(item, i) {
		validate(schema.items, item, path + '[' + i + ']', errors);
	  });
	  return;
	}

	//
	// validate array tuple schema
	//
	var i = 0;
	if (schema.items && isArray(schema.items)) {
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

	//
	// check if no additional items are allowed
	//
	if (schema.hasOwnProperty('additionalItems') && !schema.additionalItems) {
	  errors.push(error(path, 'additionalItems'));
	  return;
	}

	//
	// validate additional items
	//
	if (schema.additionalItems) {
	  // validate single-schema additional items
	  if (!isArray(schema.additionalItems)) {
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
		  schema.additionalItems.forEach(function(subSchema) {
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
	  errors.push(error(path, 'type', 'null'));
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
	if (isArray(schema.type)) {
	  // union type
	  var valid = false;
	  schema.type.forEach(function(type) {
		if (validators[type]) {
		  var localErrors = [];
		  validators[type](schema, data, path, localErrors);
		  if (localErrors.length === 0) {
			valid = true;
			return;
		  }
		}
		else {
		  errors.push(path, 'Unkown type ' + type);
		}
	  });
	  if (!valid) {
		errors.push(path, 'Failed to validate union type');
	  }
	}
	else {
	  // simple type
	  if (validators[schema.type]) {
		validators[schema.type](schema, data, path, errors);
	  }
	  else {
		errors.push(path, 'Unkown type ' + schema.type);
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
