const { ReE, ReS, to, asyncForEach, TE }         = require('../services/UtilService');
const axios = require('axios');

const buckets = [
	'bucket-1:8080',
	'bucket-2:8081',
	'bucket-3:8082',
];

// Returns values from 0 to 2
function hashKey(key) {
	return key.hashCode() % 3;
}

function getBucketUrlByKey(key) {
	return buckets[hashKey(key)];
}

/**
 * Save new key-value pair
 *
	POST Body Example
	{
		 'key': 'some_key',
		 'value': 'some value'
	}
 */
const save = async function(req, res){
	const low = require('lowdb')
	const FileSync = require('lowdb/adapters/FileSync')
	const adapter = new FileSync('db.json')
	const db = low(adapter)

	const body = req.body;
	if (!body.key || !body.value) return ReE(res, { message: 'INVALID_DATA' });

	// Hash key to determine which bucket
	const bucketUrl = getBucketUrlByKey(key);

	// POST to that bucket
	let [err, response] = await to(axios.post('http://' + bucketUrl + '/save/', { key: body.key, value: body.value }));
	if (err) return ReE(res, err);

	let found = false;
	// Loop over all keys
	allKeys.forEach(keyValuePair => {
		if (keyValuePair.key === key) {
			console.log('KEY FOUND ' + key);
			url = keyValuePair.value;
			found = true;
		}
	});

	// If the key doesn't exist insert new one
	// else update current value
	if (!found) {
		db.get('key-value').push({
			key: body.key,
			value: 'url of value'
		}).write();
	} else {
		db.get('key-value')
			.find({ key: body.key })
			.assign({ value: body.value })
			.write()
	}

	return ReS(res, {message: 'Saved Key Value'});
};
module.exports.save = save;


// GET Example: /:key
const getKey = async function(req, res){
	const low = require('lowdb')
	const FileSync = require('lowdb/adapters/FileSync')
	const adapter = new FileSync('db.json')
	const db = low(adapter)
	const key = req.params.key;
	if (!key) return ReE(res, { message: 'INVALID_DATA' });

	const bucketUrl = getBucketUrlByKey(key);

	let allKeys = db.get('key-value').value();
	let url = '';

	// Loop over all keys
	allKeys.forEach(keyValuePair => {
		if (keyValuePair.key === key) {
			console.log('KEY FOUND ' + key);
			url = keyValuePair.value;
		}
	});

	const result = '';
	// Fetch value from bucket and return value back
	let [err, response] = await to(axios.get('http://' + bucketUrl + '/get/'));
	if (err) return ReE(res, err);

	return ReS(res, {key, value: result});
};
module.exports.getKey = getKey;


/**
 * Delete key-value pair by providing key parameter
 */
const deleteKey = async function(req, res) {

	const low = require('lowdb')
	const FileSync = require('lowdb/adapters/FileSync')
	const adapter = new FileSync('db.json')
	const db = low(adapter)

	const key = req.params.key;
	if (!key) return ReE(res, { message: 'INVALID_DATA' });

	const bucketUrl = getBucketUrlByKey(key);

	let allKeys = db.get('key-value').value();

	const result = '';
	let found = false;
	// Loop over all keys
	allKeys.forEach(keyValuePair => {
		if (keyValuePair.key === key) {
			console.log('KEY FOUND ' + key);
			url = keyValuePair.value;
			found = true;
		}
	});

	// If no such key return error
	if (!found) return ReE(res, { message: 'NO_KEY' });

	try {
		// Delete the value from right bucket
		let [err, response] = await to(axios.delete('http://' + bucketUrl + '/delete/'));
		if (err) TE(err);

		db.get('key-value').remove({ key: key }).write();

		return ReS(res, {message: 'Successfully deleted'});

	} catch (e) {
		return ReE(res, { message: 'ERROR_DELETE' });
	}
};
module.exports.deleteKey = deleteKey;



/**
 * Range key-value search
 */
const rangeSearch = async function(req, res) {

	const low = require('lowdb')
	const FileSync = require('lowdb/adapters/FileSync')
	const adapter = new FileSync('db.json')
	const db = low(adapter)

	const keyStart = req.params.keyStart;
	const keyEnd = req.params.keyEnd;

	if (!keyStart || !keyEnd) return ReE(res, { message: 'INVALID_DATA' });

	let allKeys = db.get('key-value').value();

	let keysInRange = [];
	// Loop over all keys
	allKeys.forEach(keyValuePair => {
		if (keyValuePair.key >= keyStart && keyValuePair.key <= keyEnd) {
			keysInRange.push(keyValuePair.key);
		}
	});

	let finalResponse = [];
	await asyncForEach(keysInRange, async (key) => {

		// Hash key to determine which bucket
		const bucketUrl = getBucketUrlByKey(key);

		// Fetch value from bucket and return value back
		let [err, response] = await to(axios.get('http://' + bucketUrl + '/get/' + key));
		if (err) return ReE(res, err);

		finalResponse.push({
			key: key,
			value: response.data.value
		})
	});

	return ReS(res, finalResponse);
};
module.exports.rangeSearch = rangeSearch;
