const { ReE, ReS, to, asyncForEach, TE }         = require('../services/UtilService');
const axios = require('axios');

const buckets = [
	'bucket-1:12345',
	'bucket-2:12345',
	'bucket-3:12345',
];

function hashCode () {
	let hash = 0, i, chr;
	if (this.length === 0) return hash;
	for (i = 0; i < this.length; i++) {
		chr   = this.charCodeAt(i);
		hash  = ((hash << 5) - hash) + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
}

function getBucketUrlByKey(key) {
	return buckets[hashCode(key) % 3];
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
	console.log("BODY", body, "KEY: " + body.key, "VALUE: " + body.value);

	if (!body.key || !body.value) return ReE(res, { message: 'INVALID_DATA' });

	// Hash key to determine which bucket
	const bucketUrl = getBucketUrlByKey(body.key);

	// POST to that bucket
	let [err, response] = await to(axios.post('http://' + bucketUrl + '/put', { key: body.key, value: body.value }));
	if (err) return ReE(res, err);

	console.log('NODE RESPONSE', response.data);

	let allKeys = db.get('key-value').value();

	let found = false;
	// Loop over all keys
	allKeys.forEach(keyValuePair => {
		if (keyValuePair.key === body.key) {
			found = true;
		}
	});

	// If the key doesn't exist insert new one
	// else update current value
	if (!found) {
		db.get('key-value').push({
			key: body.key,
			value: response.data
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
			url = keyValuePair.value;
			console.log('KEY FOUND ' + key, 'VALUE IS ' + url);
		}
	});

	// Fetch value from bucket and return value back
	let [err, response] = await to(axios.get('http://' + bucketUrl + '/getWithPath?path=' + url));
	if (err) return ReE(res, { message: 'NOT_FOUND' });

	return ReS(res, {key, value: response.data.value});
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

	let found = false;
	// Loop over all keys
	allKeys.forEach(keyValuePair => {
		if (keyValuePair.key === key) {
			console.log('KEY FOUND ' + key);
			found = true;
		}
	});

	// If no such key return error
	if (!found) return ReE(res, { message: 'NO_KEY' });

	try {
		// Delete the value from right bucket
		let [err, response] = await to(axios.get('http://' + bucketUrl + '/delete/' + key));
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
