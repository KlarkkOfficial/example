const express = require('express');
const router = express.Router();
const path = require('path');

const config = require(path.resolve(__dirname + '/../../../config/config.js'));
const access = require(path.resolve(__dirname + '/access.js'));
const mongoClient = require(path.resolve(__dirname + '/../../../config/mongo-client.js'));
const ObjectID = mongoClient.getObjectID();

const Notifications = require(path.resolve(__dirname + '/../../../modules/notifications.js'));

/**
 * Fetch
 * =====
 */
router.get('/', access.checkAccessApi, access.checkUser, (req, res) => {
	const companyId = req.user._cId;
	return mongoClient.getInstance().then(db => {
		const collection = db.collection('companies');
		return collection.findOne({ '_id': new ObjectID(companyId) }, { departments: 1 }).then(docs => {
			const data = docs.departments ? docs.departments : [];
			return res.status(200).json(data);
		});
	});
});

/**
 * Create
 * ======
 */
router.post('/', access.checkAccessApi, access.checkUser, (req, res) => {
	const user = req.user;
	const companyId = user._cId;
	return mongoClient.getInstance().then(db => {
		const collection = db.collection('companies');
		const item = {
			'_id': new ObjectID(),
			'name': false,
			'createdAt': new Date()
		};
		Notifications.save(companyId, user, 'создал новый отдел');
		return collection.updateOne({ '_id': new ObjectID(companyId) }, { $push: { 'departments': item }}, { upsert: true }).then(result => {
			return res.status(200).json({ item: item });
		});
	});
});

/**
 * Update: Rename
 * ==============
 */
router.put('/rename/:departmentId', access.checkAccessApi, access.checkUser, (req, res) => {
    const body = req.body;
    const param = req.params;
	const companyId = req.user._cId;
	return mongoClient.getInstance().then(db => {
		const updateDepartments = db.collection('companies').updateOne({ 
			$and: [
				{ '_id': new ObjectID(companyId) },
				{ 'departments._id': new ObjectID(param.departmentId) }
			]
		}, { $set: { 'departments.$.name': body.name }});
		const updateUsers = db.collection('users').updateMany({ 
			$and: [
				{ '_cId': new ObjectID(companyId) },
				{ 'department._id': new ObjectID(param.departmentId) }
			]
		}, { $set: { 'department.name': body.name }});
		return Promise.all([ updateDepartments, updateUsers ]).then(result => {
			return res.json({ 'message': 'Данные обновлены' });
		});
	});
});

/**
 * Delete
 * ======
 */
router.delete('/:departmentId', access.checkAccessApi, access.checkUser, (req, res) => {
    const param = req.params;
	const companyId = req.user._cId;
	return mongoClient.getInstance().then(db => {
		const query1 = db.collection('companies').updateOne({ 
			$and: [
				{ '_id': new ObjectID(companyId) },
				{ 'departments._id': new ObjectID(param.departmentId) }
			]
		}, { $pull: { departments: { '_id': new ObjectID(param.departmentId) } } });
		const query2 = db.collection('users').updateMany({ 
			$and: [
				{ '_cId': new ObjectID(companyId) },
				{ 'department._id': new ObjectID(param.departmentId) }
			]
		}, { $unset: { 'department': '' }});
		const query3 = db.collection('entries').updateMany({ 
			$and: [
				{ '_cId': new ObjectID(companyId) },
				{ '_dId': new ObjectID(param.departmentId) }
			]
		}, { $unset: { '_dId': '' }});
		return Promise.all([ query1, query2, query3 ]).then(result => {
			return res.json({ 'message': 'Отдел удален' });
		});
	});
});

/**
 * Fetch: Fetch Department Users
 * =============================
 */
router.get('/:departmentId/users', access.checkAccessApi, access.checkUser, (req, res) => {
	const param = req.params;
	const companyId = req.user._cId;
	return mongoClient.getInstance().then(db => {
		return db.collection('users').find({ '_cId': new ObjectID(companyId), 'department._id': new ObjectID(param.departmentId) }).toArray().then(docs => {
			return res.json(docs);
		});
	});
});

/**
 * Fetch: Free Departments Users
 * =============================
 */
router.get('/freeusers', access.checkAccessApi, access.checkUser, (req, res) => {
	const companyId = req.user._cId;
	return mongoClient.getInstance().then(db => {
		return db.collection('users').find({ '_cId': new ObjectID(companyId), 'department': { $exists: false } }).toArray().then(docs => {
			return res.json(docs);
		});
	});
});

/**
 * Update: Update User Department
 * ==============================
 */
router.put('/:departmentId/:userId', access.checkAccessApi, access.checkUser, (req, res) => {
	const body = req.body;
	const param = req.params;
	const companyId = req.user._cId;
	return mongoClient.getInstance().then(db => {
		const updateDepartmentPromise = db.collection('users').updateOne({ 
			$and: [ 
				{  '_id': new ObjectID(param.userId) },
				{ '_cId': new ObjectID(companyId) }
			]
		}, { $set: { 'department': { 
				'_id': new ObjectID(param.departmentId),
				'name': body.name
			}}
		});
		const updateEntriesPromise = db.collection('entries').updateMany({
			$and: [
				{ '_cId': new ObjectID(companyId) },
				{ '_uId': new ObjectID(param.userId) },
			]
		}, { $set: { '_dId': new ObjectID(param.departmentId) } });
		return Promise.all([ updateDepartmentPromise, updateEntriesPromise ]).then(result => {
			return res.json({ 'message': 'Данные обновлены' });
		});
	});
});

/**
 * Delete: Update User Department
 * ==============================
 */
router.delete('/:departmentId/:userId', access.checkAccessApi, access.checkUser, (req, res) => {
    const param = req.params;
	const companyId = req.user._cId;
	return mongoClient.getInstance().then(db => {
		const deleteUserPromise = db.collection('users').updateOne({ 
			$and: [ 
				{  '_id': new ObjectID(param.userId) },
				{ '_cId': new ObjectID(companyId) }
			]
		}, { $unset: { 'department': '' } });
		const updateEntriesPromise = db.collection('entries').updateMany({
			$and: [
				{ '_cId': new ObjectID(companyId) },
				{ '_uId': new ObjectID(param.userId) },
				{ '_dId': new ObjectID(param.departmentId) }
			]
		}, { $unset: { '_dId': '' } });
		return Promise.all([ deleteUserPromise, updateEntriesPromise ]).then(result => {
			return res.json({ 'message': 'Данные обновлены' });
		});
	});
});

module.exports = router;