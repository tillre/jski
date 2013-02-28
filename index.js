//
// joskito - json schema validation
//


var error = function(path, msg) {
  console.log('error: ', path, msg);
  return { path: path, message: msg };
};


var isArray = function(a) {
  return Object.prototype.toString.call(a) === '[object Array]';
};


var validators = {
  'string': function(schema, string, path, errors) {
	if (typeof string !== 'string') {
	  errors.push(error(path, 'Value is not a string'));
	}
	if (schema.pattern && !(new RegExp(schema.pattern)).test(string)) {
	  errors.push(error(path, 'String does not match pattern'));
	}
	if (schema.hasOwnProperty('minLength') && string.length < schema.minLength) {
	  errors.push(error(path, 'String is too short'));
	}
	if (schema.hasOwnProperty('maxLength') && string.length > schema.maxLength) {
	  errors.push(error(path, 'String is too long'));
	}
  },
  
  'number': function(schema, number, path, errors) {
	if (typeof number !== 'number') {
	  errors.push(error(path, 'Value is not a number'));
	  return;
	}
	if (schema.hasOwnProperty('minimum') && number < schema.minimum) {
	  errors.push(error(path, 'Number is below minimum'));
	}
	if (schema.hasOwnProperty('maximum') && number > schema.maximum) {
	  errors.push(error(path, 'Number is greater than the maximum'));
	}
	if (schema.hasOwnProperty('exclusiveMinimum') && number <= schema.exclusiveMinimum) {
	  errors.push(error(path, 'Number is equal to or less than exclusive minimum'));
	}
	if (schema.hasOwnProperty('exclusiveMaximum') && number >= schema.exclusiveMaximum) {
	  errors.push(error(path, 'Number is equal to or greater than exclusive maximum'));
	}
  },
  
  'integer': function(schema, value, path, errors) {
	if (typeof value !== 'number') {
	  errors.push(error(path, 'Value is not a number'));
	  return;
	}
	if (Math.ceil(value) !== value) {
	  errors.push(error(path, 'Value is a number, but not an integer'));
	}
	if (schema.hasOwnProperty('minimum') && value < schema.minimum) {
	  errors.push(error(path, 'Integer is below minimum'));
	}
	if (schema.hasOwnProperty('maximum') && value > schema.maximum) {
	  errors.push(error(path, 'Integer is greater than the maximum'));
	}
	if (schema.hasOwnProperty('exclusiveMinimum') && value <= schema.exclusiveMinimum) {
	  errors.push(error(path, 'Integer is equal to or less than exclusive minimum'));
	}
	if (schema.hasOwnProperty('exclusiveMaximum') && value >= schema.exclusiveMaximum) {
	  errors.push(error(path, 'Integer is equal to or greater than exclusive maximum'));
	}
  },

  'boolean': function(schema, value, path, errors) {
	if (typeof value !== 'boolean') {
	  errors.push(error(path, 'Value is not a boolean'));
	}
  },
  
  'object': function(schema, object, path, errors) {
	if (typeof object !== 'object' || isArray(object)) {
	  errors.push(error(path, 'This is not an object'));
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
			errors.push(error, path + '.' + key, 'Property does not meet dependency');
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
		  errors.push(error(path + '.' + key, 'Property does not exist, but has dependency'));
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
		  errors.push(error(subPath, 'Property is missing from object'));
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
		errors.push(error(subPath, 'Additional property is not allowed on object'));
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
		errors.push(error(subPath, 'Property not allowed on object'));
	  }
	});

  },
  
  'array': function(schema, array, path, errors) {
	if (!isArray(array)) {
	  errors.push(error(path, 'Value is not an array'));
	  return;
	}
	// check min/max
	if (schema.hasOwnProperty('minItems') && array.length < schema.minItems) {
	  errors.push(error(path, 'Array has not enough items'));
	}
	if (schema.hasOwnProperty('maxItems') && array.length > schema.maxItems) {
	  errors.push(error(path, 'Array has too many items'));
	}

	//
	// test if array only contains unique items
	//
	if (schema.uniqueItems) {
	  var cache = {};
	  array.forEach(function(item, i) {
		var str = JSON.stringify(item);
		if (cache[str]) {
		  errors.push(error(path, 'Array is not unique'));
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
		  errors.push(error(subPath), 'Item does not exist in instance');
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
	  errors.push(error(path, 'Additional items are not allowed'));
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
			errors.push(error(subPath, 'Item not valid'));
		  }
		}
	  }
	}
  },
  
  'null': function(schema, value, path, errors) {
	if (value !== null) {
	  errors.push(error(path, 'Value is not null'));
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
