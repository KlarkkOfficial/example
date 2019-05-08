const express = require('express');
const router = express.Router();
const path = require('path');
const _ = require('lodash');
const rp = require('request-promise');

const config = require(path.resolve(__dirname + '/../../../config/config.js'));
const access = require(path.resolve(__dirname + '/access.js'));
const mongoClient = require(path.resolve(__dirname + '/../../../config/mongo-client.js'));
const ObjectID = mongoClient.getObjectID();

const COLL_NAME = 'settings';

/*
 * Fetch Users Roles
 * =================
 */
router.get('/', access.checkAccessApi, access.checkUser, (req, res) => {
	return mongoClient.getInstance().then(db => {
		const collection = db.collection(COLL_NAME);
		return collection.findOne({}).then(data => {
			return res.json(data);
		});
	});
});

/*
 * Fetch Lists
 * ===========
 */
router.get('/lists', access.checkAccessApi, access.checkUser, (req, res) => {
	return mongoClient.getInstance().then(db => {
		const collection = db.collection(COLL_NAME);
		return collection.findOne({}, { lists: 1, listsFields: 1 }).then(docs => {
			return res.json({ 
				lists: docs.lists || [], 
				listsFields: docs.listsFields || [] 
			});
		});
	});
});

/*
 * Fetch Lists Fields
 * ==================
 */
router.get('/lists/fields', access.checkAccessApi, access.checkUser, (req, res) => {
	return mongoClient.getInstance().then(db => {
		const collection = db.collection(COLL_NAME);
		return collection.findOne({}, { lists: 1, listsFields: 1 }).then(docs => {
            const listsFields = docs.listsFields || [];
			return res.json({ listsFields: listsFields });
		});
	}).catch(error => res.status(400).json({ message: error.message }));
});

/*
 * Fetch Users Roles
 * =================
 */
router.get('/users/roles', access.checkAccessApi, access.checkUser, (req, res) => {
	return mongoClient.getInstance().then(db => {
		const collection = db.collection(COLL_NAME);
		return collection.findOne({}, { usersRoles: 1 }).then(data => {
			const usersRoles = data.usersRoles ? data.usersRoles : [];
			return res.json(usersRoles);
		});
	});
});

module.exports = router;