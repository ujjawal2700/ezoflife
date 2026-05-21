import dotenv from 'dotenv';
dotenv.config();
import { sendJobApplicationConfirmation, sendAdminJobApplicationNotification } from '../src/utils/emailHelper.js';

console.log('Environment Settings:');
console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL);

const applicationMock = {
    applicantName: 'Test Candidate',
    applicantEmail: process.env.EMAIL_USER, // send to self to verify
    contactNumber: '+919999999999',
    experience: '3 Years',
    coverLetter: 'Hello, I am interested in this position!'
};

const jobTitle = 'Software Engineer (Test)';

async function testEmails() {
    try {
        console.log('\nSending application confirmation to applicant...');
        const res1 = await sendJobApplicationConfirmation(applicationMock, jobTitle);
        console.log('✅ Applicant confirmation sent. MessageId:', res1.messageId);

        console.log('\nSending notification to Admin...');
        const res2 = await sendAdminJobApplicationNotification(applicationMock, jobTitle);
        console.log('✅ Admin notification sent. MessageId:', res2.messageId);

        console.log('\nAll email functions executed successfully!');
    } catch (err) {
        console.error('❌ Error sending emails:', err);
    }
}

testEmails();
