const router = require('express').Router();
const CardController = require('../../controllers/CardController');
const CommentController = require('../../controllers/CommentController');

router.get('/:id', CardController.findById);
router.put('/:id', CardController.update);
router.delete('/:id', CardController.drop);
router.post('/:id/addColor', CardController.addColor);
router.post('/:id/removeColor', CardController.removeColor);
router.post('/move', CardController.move);
router.post('/:id/comments', CommentController.create);

module.exports = router;
