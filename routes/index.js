const MainController = require('../controllers/main.controller');

module.exports = function (express) {
	const router = express.Router();

	// ----------- Routes -------------
	router.post('/save',                    MainController.save);
	router.get('/:key',                     MainController.getKey);
	router.get('/range/:keyStart/:keyEnd',  MainController.rangeSearch);
	router.delete('/:key',                  MainController.deleteKey);

	return router;
};
