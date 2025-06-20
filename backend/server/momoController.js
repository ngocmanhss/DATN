import https from 'https';
import crypto from 'crypto';


const accessKey = 'F8BBA842ECF85';
const secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
const partnerCode = 'MOMO';




export async function createMomoPayment(req, res) {
  try {
    const { amount, orderInfo } = req.body;
    if (!amount || !orderInfo) {
      return res.status(400).json({ success: false, message: 'Thiếu amount hoặc orderInfo' });
    }

    const orderId = partnerCode + Date.now(); // Tạo orderId động
    const requestId = orderId;
    const requestType = 'payWithMethod';
    const extraData = '';

    // Cập nhật redirect URL để trỏ về màn hình order
    const redirectUrl = "";
    const ipnUrl = `https://callback.url/notify`;

    const rawSignature = 
      `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = JSON.stringify({
      partnerCode,
      partnerName: 'TestMerchant',
      storeId: 'MomoTestStore',
      requestId,
      amount: amount.toString(),
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang: 'vi',
      requestType,
      autoCapture: true,
      extraData,
      orderGroupId: '',
      signature
    });

    const options = {
      hostname: 'test-payment.momo.vn',
      port: 443,
      path: '/v2/gateway/api/create',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    const momoReq = https.request(options, momoRes => {
      let data = '';
      momoRes.setEncoding('utf8');
      momoRes.on('data', chunk => {
        data += chunk;
      });
      momoRes.on('end', () => {
        try {
          const responseBody = JSON.parse(data);
          if (responseBody.resultCode === 0 && responseBody.payUrl) {
            return res.json({
              success: true,
              payUrl: responseBody.payUrl,
              orderId
            });
          } else {
            return res.status(400).json({
              success: false,
              message: responseBody.message || 'Momo trả về lỗi'
            });
          }
        } catch (e) {
          console.error('Lỗi parse response Momo:', e);
          return res.status(500).json({ success: false, message: 'Lỗi xử lý response từ Momo' });
        }
      });
    });

    momoReq.on('error', e => {
      console.error('Error request tới Momo:', e.message);
      return res.status(500).json({ success: false, message: 'Không thể kết nối đến Momo' });
    });

    momoReq.write(requestBody);
    momoReq.end();

  } catch (err) {
    console.error('Exception createMomoPayment:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server nội bộ' });
  }
}


// Handle return URL for MoMo after payment
export function handleReturnUrl(req, res) {
  const { orderId, resultCode } = req.query;
  const html = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"/><title>Thanh toán MoMo</title></head>
      <body>
        <script>
          const oid = '${orderId}';
          const rc = '${resultCode}';
          // Chuyển hướng qua deep link với orderId và resultCode
          window.location = 'exp://172.20.10.2:8081/(user)/order?orderId=' + oid + '&resultCode=' + rc;
        </script>
        <p>Đang chuyển về ứng dụng...</p>
      </body>
    </html>
  `;
  res.send(html);
}


// Handle IPN notifications (notify MoMo about payment status)
export function handleNotify(req, res) {
  console.log('Momo Notify:', req.body);
  res.json({ resultCode: 0, message: 'Success' });
}

export default { createMomoPayment, handleReturnUrl, handleNotify };
