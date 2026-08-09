const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// ==========================================
// إعدادات البيانات والتوكنات الخاصة بك
// ==========================================
const WHATSAPP_TOKEN = 'ضع_هنا_توكن_ميتا_الدائم_أو_المؤقت';
const PHONE_NUMBER_ID = '7794189252778687'; // معرف رقم الهاتف من ميتا
const USER_PHONE_NUMBER = '0788251064'; // رقم هاتفك الشخصي أو التجاري
const GEMINI_API_KEY = 'ضع_هنا_مفتاح_جيمني_API_Key';
const VERIFY_TOKEN = 'oday123';

// ==========================================
// 1. الواجهة الأمامية (HTML + CSS) للتحقق من عمل السيرفر
// ==========================================
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>بوت واتساب - Gemini AI</title>
            <style>
                body { font-family: Tahoma, sans-serif; background-color: #0b2545; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .box { background: #134074; padding: 30px; border-radius: 12px; text-align: center; box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
                h2 { color: #ee6c4d; }
                .status { background: #2b9348; padding: 8px 15px; border-radius: 20px; display: inline-block; margin-top: 10px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="box">
                <h2>نظام الرد الآلي للرقم: ${USER_PHONE_NUMBER}</h2>
                <p>السيرفر يعمل بكفاءة وجاهز لربط واتساب بنموذج جيمني.</p>
                <div class="status">السيرفر متصل ويعمل ✅</div>
            </div>
        </body>
        </html>
    `);
});

// ==========================================
// 2. التحقق من الـ Webhook مع ميتا
// ==========================================
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token === VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// ==========================================
// 3. استقبال رسائل واتساب والرد عبر Gemini
// ==========================================
app.post('/webhook', async (req, res) => {
    try {
        const bodyParam = req.body;

        if (bodyParam.object === 'whatsapp_business_account') {
            const messageInfo = bodyParam.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
            
            if (messageInfo) {
                const senderPhone = messageInfo.from; // رقم الشخص المرسل
                const userMessage = messageInfo.text?.body; // نص الرسالة

                if (userMessage) {
                    console.log(`رسالة واردة من ${senderPhone}: ${userMessage}`);

                    // جلب الرد من ذكاء Gemini الاصطناعي
                    const aiResponse = await getGeminiResponse(userMessage);

                    // إرسال الرد الآلي للمستخدم عبر واتساب
                    await sendWhatsAppMessage(senderPhone, aiResponse);
                }
            }
            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error("خطأ في معالجة الـ Webhook:", error.message);
        res.sendStatus(500);
    }
});

// ==========================================
// دالة الاتصال بنموذج Google Gemini
// ==========================================
async function getGeminiResponse(prompt) {
    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            { contents: [{ parts: [{ text: prompt }] }] },
            { headers: { 'Content-Type': 'application/json' } }
        );
        return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
        return "عذراً، حدث خطأ في معالجة طلبك عبر الذكاء الاصطناعي حالياً.";
    }
}

// ==========================================
// دالة إرسال الرد عبر WhatsApp Cloud API
// ==========================================
async function sendWhatsAppMessage(to, message) {
    try {
        await axios.post(
            `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: "whatsapp",
                to: to,
                text: { body: message },
            },
            {
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                    'Content-Type': 'application/json',
                }
            }
        );
        console.log(`تم إرسال الرد بنجاح إلى الرقم: ${to}`);
    } catch (error) {
        console.error("خطأ في إرسال واتساب:", error.response?.data || error.message);
    }
}

// ==========================================
// تشغيل الخادم
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`السيرفر يعمل الآن على المنفذ ${PORT}`);
});
