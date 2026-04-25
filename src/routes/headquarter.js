import express from 'express';
import HeadquarterController from "../controllers/headquaterController.js";

const router = express.Router();

router.post('/', async (req, res) => {
  await HeadquarterController.create(req, res);
});

router.get('/', async (req, res) => {
  await HeadquarterController.getList(req, res);
});

router.get('/:id', async(req, res)=>{
  await HeadquarterController.getById(req, res);
})
export default router;