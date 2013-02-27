/*global describe it expect*/

var validate = require('../index.js');

describe('Validation of JSON schema', function() {
  it('should validate empty schema with any object', function() {
	expect(validate({}, {foo: 'bar'}).valid).toBe(true);
  });

  it('is not valid when it has errors', function() {
	expect(validate({type: 'string'}, 42).errors.length).toBeGreaterThan(0);
	expect(validate({type: 'string'}, 42).valid).toBe(false);
  });

  describe('5.1. types', function() {
	it('should validate simple types', function() {
	  expect(validate({type: 'string'}, '').valid).toBe(true);
	  expect(validate({type: 'number'}, 3.3).valid).toBe(true);
	  expect(validate({type: 'integer'}, 3).valid).toBe(true);
	  expect(validate({type: 'integer'}, 3.3).valid).toBe(false);
	  expect(validate({type: 'boolean'}, true).valid).toBe(true);
	  expect(validate({type: 'object'}, {}).valid).toBe(true);
	  expect(validate({type: 'array'}, []).valid).toBe(true);
	  expect(validate({type: 'null'}, null).valid).toBe(true);
	  expect(validate({type: 'any'}, 123).valid).toBe(true);
	});

	it('should validate union types', function() {
	  expect(validate({type: ['string', 'number']}, '').valid).toBe(true);
	  expect(validate({type: ['string', 'number']}, 42).valid).toBe(true);
	});
  });

  describe('5.2. object properties', function() {
	var schema = {type: 'object', properties: {foo: {type: 'number'}, bar: {type: 'null'}}};

	it('should be valid', function() {
	  expect(validate(schema, {foo: 42, bar: null}).valid).toBe(true);
	});
	it('should be valid with additional properties not in the schema', function() {
	  expect(validate(schema, {foo: 42, bar: null, baz: 'hello'}).valid).toBe(true);
	});
	it('should not be valid when properties are missing', function() {
	  expect(validate(schema, {foo: 42, bar: ""}).valid).toBe(false);
	});
  });
  
  describe('5.3. pattern object properties', function() {
	var schema = {type: 'object', patternProperties: {'\\w+_bar': {type: 'number'}}};

	it('should be valid', function() {
	  expect(validate(schema, {foo_bar: 1, baz_bar: 2}).valid).toBe(true);
	});
	it('should not be valid when not matching', function() {
	  expect(validate(schema, {foo_bar: 1, bar_foo: 2}).valid).toBe(false);
	});
  });
  
  describe('5.4. additional object properties', function() {
	var schema = {type: 'object',
				  properties: {foo: {type: 'number'}, bar: {type: 'null'}},
				  additionalProperties: {baz: {type: 'string'}}};

	it('should be valid with additional defined properties', function() {
	  expect(validate(schema, {foo: 42, bar: null, baz: ''}).valid).toBe(true);
	});
	it('should not be valid when no schema is found for property', function() {
	  expect(validate(schema, {foo: 42, bar: null, baz: []}).valid).toBe(false);
	});
  });

  describe('5.5. array items', function() {
	it('should validate an array tuple', function() {
	  // expect(validate({type: 'array', }))
	});

	it('should validate an array of items conforming to one schema', function() {
	  
	});
  });

  describe('5.6. array of additional items', function() {
	  expect(false).toBe(true);
  });

  
});
