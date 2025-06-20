import express from 'express';
import userRouter from '../routes/userRoute.js';
import momoController from '../server/momoController.js';


const app = express();
app.use(express.json());

// Mount router user
app.use('/api/user', userRouter);

// Mount các route MoMo
app.post('/api/momo/create', momoController.createMomoPayment);
app.post('/api/momo/update-payment-status', momoController.updatePaymentStatus);
app.get('/momo-return', momoController.handleReturnUrl);
app.post('/api/momo/notify', momoController.handleNotify);

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server đang chạy trên http://0.0.0.0:${PORT}`);
});
