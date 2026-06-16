import Razorpay from 'razorpay';
import dotenv from 'dotenv';
dotenv.config();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_placeholder'
});

async function test() {
    console.log('Testing Razorpay order creation with key:', process.env.RAZORPAY_KEY_ID);
    try {
        const options = {
            amount: 5900, // In paise (59 INR)
            currency: 'INR',
            receipt: `receipt_test_${Date.now()}`
        };
        const order = await razorpay.orders.create(options);
        console.log('Success! Razorpay Order Created:', order);
    } catch (err) {
        console.error('Error creating Razorpay order:', err);
    }
}
test();
