import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import { Stream } from 'stream';

/**
 * Generates a PDF buffer from inquiry data
 */
export const generateInquiryPDF = (data) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(25).text('Advertisement Inquiry Details', { align: 'center' });
        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        // Details
        const details = [
            { label: 'Brand Name', value: data.brandName },
            { label: 'Contact Email', value: data.email },
            { label: 'Phone Number', value: data.phone },
            { label: 'Target Location', value: data.location },
            { label: 'Budget (INR)', value: `Rs. ${data.budget?.toLocaleString()}` },
            { label: 'Expected Timeline', value: data.timeline },
            { label: 'Submission Date', value: new Date(data.createdAt || Date.now()).toLocaleString() }
        ];

        details.forEach(item => {
            doc.fontSize(12).font('Helvetica-Bold').text(`${item.label}: `, { continued: true })
               .font('Helvetica').text(item.value);
            doc.moveDown(0.5);
        });

        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();
        
        doc.fontSize(10).font('Helvetica-Oblique')
           .text('This is a computer-generated summary of your advertisement inquiry.', { align: 'center', color: 'grey' });

        doc.end();
    });
};

/**
 * Sends a confirmation email to the customer with details in the body
 */
export const sendInquiryConfirmation = async (inquiryData) => {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_PORT == 465,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: `"Spinzyt Team" <${process.env.EMAIL_USER}>`,
        to: inquiryData.email,
        subject: 'We’ve received your inquiry! – Team Spinzyt',
        text: `Hi ${inquiryData.brandName},\n\nThank you for reaching out to Spinzyt and providing your details. We appreciate your interest in our platform.\n\nOur team is currently reviewing your submission, and we will get back to you as soon as possible with the next steps.\n\nSubmission Summary:\nBrand: ${inquiryData.brandName}\nEmail: ${inquiryData.email}\nPhone: ${inquiryData.phone}\nLocation: ${inquiryData.location}\nBudget: Rs. ${inquiryData.budget?.toLocaleString()}\nTimeline: ${inquiryData.timeline}\n\nBest regards,\nThe Spinzyt Team`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 30px;">
                <p>Hi <strong>${inquiryData.brandName}</strong>,</p>
                <p>Thank you for reaching out to <strong>Spinzyt</strong> and providing your details. We appreciate your interest in our platform.</p>
                <p>Our team is currently reviewing your submission, and we will get back to you as soon as possible with the next steps.</p>
                
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 25px 0; border: 1px solid #f1f5f9;">
                    <h3 style="margin-top: 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">Submission Details</h3>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Brand:</strong> ${inquiryData.brandName}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Email:</strong> ${inquiryData.email}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Phone:</strong> ${inquiryData.phone}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Location:</strong> ${inquiryData.location}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Budget:</strong> Rs. ${inquiryData.budget?.toLocaleString()}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Timeline:</strong> ${inquiryData.timeline}</p>
                </div>

                <p style="margin-top: 25px;">Best regards,<br /><strong style="color: #0f172a;">The Spinzyt Team</strong></p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};

/**
 * Sends a notification email to the Admin for new inquiry
 */
export const sendAdminInquiryNotification = async (inquiryData) => {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_PORT == 465,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: `"EzOfLife System" <${process.env.EMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: `New Advertisement Inquiry: ${inquiryData.brandName}`,
        text: `New Brand Inquiry Received!\n\nDetails:\nBrand Name: ${inquiryData.brandName}\nContact Email: ${inquiryData.email}\nPhone: ${inquiryData.phone}\nLocation: ${inquiryData.location}\nBudget: Rs. ${inquiryData.budget?.toLocaleString()}\nTimeline: ${inquiryData.timeline}\n\nPlease review this in the Admin Panel.`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                <h2 style="color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">New Brand Inquiry Received!</h2>
                <p>You have a new advertisement inquiry from the customer app.</p>
                
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Brand Name:</strong> ${inquiryData.brandName}</p>
                    <p style="margin: 5px 0;"><strong>Contact Email:</strong> ${inquiryData.email}</p>
                    <p style="margin: 5px 0;"><strong>Phone:</strong> ${inquiryData.phone}</p>
                    <p style="margin: 5px 0;"><strong>Location:</strong> ${inquiryData.location}</p>
                    <p style="margin: 5px 0;"><strong>Budget:</strong> Rs. ${inquiryData.budget?.toLocaleString()}</p>
                    <p style="margin: 5px 0;"><strong>Timeline:</strong> ${inquiryData.timeline}</p>
                </div>

                <p style="font-size: 13px; color: #64748b;">Directly review and manage this lead in your Admin Hub under the "Advertise" section.</p>
                <br />
                <p>Best Regards,<br /><strong>EzOfLife System</strong></p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};

/**
 * Sends a confirmation email to the customer for Partnership Inquiry
 */
export const sendPartnershipConfirmation = async (data) => {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_PORT == 465,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: `"Spinzyt Team" <${process.env.EMAIL_USER}>`,
        to: data.email,
        subject: 'We’ve received your inquiry! – Team Spinzyt',
        text: `Hi ${data.companyName},\n\nThank you for reaching out to Spinzyt and providing your details. We appreciate your interest in our platform.\n\nOur team is currently reviewing your submission, and we will get back to you as soon as possible with the next steps.\n\nPartnership Details:\nCompany: ${data.companyName}\nEmail: ${data.email}\nPhone: ${data.phone}\nLocation: ${data.location}\nType: ${data.partnershipType}\nWebsite: ${data.website || 'N/A'}\nProposal: ${data.proposal}\n\nBest regards,\nThe Spinzyt Team`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 30px;">
                <p>Hi <strong>${data.companyName}</strong>,</p>
                <p>Thank you for reaching out to <strong>Spinzyt</strong> and providing your details. We appreciate your interest in our platform.</p>
                <p>Our team is currently reviewing your submission, and we will get back to you as soon as possible with the next steps.</p>
                
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 25px 0; border: 1px solid #f1f5f9;">
                    <h3 style="margin-top: 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">Partnership Details</h3>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Company:</strong> ${data.companyName}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Email:</strong> ${data.email}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Phone:</strong> ${data.phone}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Location:</strong> ${data.location}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Type:</strong> ${data.partnershipType}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Website:</strong> ${data.website || 'N/A'}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Proposal:</strong> ${data.proposal}</p>
                </div>

                <p style="margin-top: 25px;">Best regards,<br /><strong style="color: #0f172a;">The Spinzyt Team</strong></p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};

/**
 * Sends a notification email to the Admin for new Partnership Inquiry
 */
export const sendAdminPartnershipNotification = async (data) => {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_PORT == 465,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: `"Spinzyt System" <${process.env.EMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: `New Partnership Inquiry: ${data.companyName}`,
        text: `New Partnership Proposal Received!\n\nDetails:\nCompany: ${data.companyName}\nEmail: ${data.email}\nPhone: ${data.phone}\nLocation: ${data.location}\nType: ${data.partnershipType}\nWebsite: ${data.website || 'N/A'}\nProposal: ${data.proposal}\n\nPlease review this in the Admin Panel.`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                <h2 style="color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">New Partnership Proposal!</h2>
                <p>You have received a new partnership inquiry from the customer app.</p>
                
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #f1f5f9;">
                    <p style="margin: 5px 0;"><strong>Company:</strong> ${data.companyName}</p>
                    <p style="margin: 5px 0;"><strong>Contact Email:</strong> ${data.email}</p>
                    <p style="margin: 5px 0;"><strong>Phone:</strong> ${data.phone}</p>
                    <p style="margin: 5px 0;"><strong>Location:</strong> ${data.location}</p>
                    <p style="margin: 5px 0;"><strong>Partnership Type:</strong> ${data.partnershipType}</p>
                    <p style="margin: 5px 0;"><strong>Website:</strong> ${data.website || 'N/A'}</p>
                    <p style="margin: 5px 0;"><strong>Proposal:</strong> ${data.proposal}</p>
                </div>

                <p style="font-size: 13px; color: #64748b;">Directly review and manage this inquiry in your Admin Hub under the "Partnerships" section.</p>
                <br />
                <p>Best Regards,<br /><strong>Spinzyt System</strong></p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};

/**
 * Sends a confirmation email to the user for Becoming a Vendor
 */
export const sendVendorApplicationConfirmation = async (data) => {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_PORT == 465,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: `"Spinzyt Team" <${process.env.EMAIL_USER}>`,
        to: data.email,
        subject: 'We’ve received your inquiry! – Team Spinzyt',
        text: `Hi ${data.ownerName || data.displayName},\n\nThank you for reaching out to Spinzyt and providing your details. We appreciate your interest in our platform.\n\nOur team is currently reviewing your submission, and we will get back to you as soon as possible with the next steps.\n\nApplication Details:\nOwner Name: ${data.ownerName}\nFacility Name: ${data.facilityName}\nBusiness Type: ${data.businessType}\nAddress: ${data.businessAddress}\nPAN: ${data.panNumber}\nGST: ${data.gstNumber || 'N/A'}\n\nBank Details:\nAccount Holder: ${data.bankDetails?.accountHolderName}\nAccount Number: ${data.bankDetails?.accountNumber}\nIFSC: ${data.bankDetails?.ifscCode}\nBank: ${data.bankDetails?.bankName}\n\nBest regards,\nThe Spinzyt Team`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 30px;">
                <p>Hi <strong>${data.ownerName || data.displayName}</strong>,</p>
                <p>Thank you for reaching out to <strong>Spinzyt</strong> and providing your details. We appreciate your interest in our platform.</p>
                <p>Our team is currently reviewing your submission, and we will get back to you as soon as possible with the next steps.</p>
                
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 25px 0; border: 1px solid #f1f5f9;">
                    <h3 style="margin-top: 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">Application Summary</h3>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Owner Name:</strong> ${data.ownerName}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Facility Name:</strong> ${data.facilityName}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Business Type:</strong> ${data.businessType}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Facility Address:</strong> ${data.businessAddress}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>PAN Number:</strong> ${data.panNumber}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>GST Number:</strong> ${data.gstNumber || 'N/A'}</p>
                    
                    <h3 style="margin-top: 20px; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">Bank Details</h3>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Account Holder:</strong> ${data.bankDetails?.accountHolderName}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Account Number:</strong> ${data.bankDetails?.accountNumber}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>IFSC Code:</strong> ${data.bankDetails?.ifscCode}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Bank Name:</strong> ${data.bankDetails?.bankName}</p>
                </div>

                <p style="margin-top: 25px;">Best regards,<br /><strong style="color: #0f172a;">The Spinzyt Team</strong></p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};

/**
 * Sends a notification email to the Admin for new Vendor Application
 */
export const sendAdminVendorApplicationNotification = async (data) => {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_PORT == 465,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: `"Spinzyt System" <${process.env.EMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: `New Vendor Application: ${data.facilityName || data.displayName}`,
        text: `New Vendor Onboarding Request Received!\n\nDetails:\nOwner: ${data.ownerName}\nFacility: ${data.facilityName}\nPhone: ${data.phone}\nEmail: ${data.email || 'N/A'}\nType: ${data.businessType}\nAddress: ${data.businessAddress}\n\nPlease review this in the Admin Panel.`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                <h2 style="color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">New Vendor Request!</h2>
                <p>A new vendor has submitted their application dossier for review.</p>
                
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #f1f5f9;">
                    <p style="margin: 5px 0;"><strong>Owner Name:</strong> ${data.ownerName}</p>
                    <p style="margin: 5px 0;"><strong>Facility Name:</strong> ${data.facilityName}</p>
                    <p style="margin: 5px 0;"><strong>Contact Phone:</strong> ${data.phone}</p>
                    <p style="margin: 5px 0;"><strong>Contact Email:</strong> ${data.email || 'N/A'}</p>
                    <p style="margin: 5px 0;"><strong>Business Type:</strong> ${data.businessType}</p>
                    <p style="margin: 5px 0;"><strong>Facility Address:</strong> ${data.businessAddress}</p>
                    <p style="margin: 5px 0;"><strong>Bank Account:</strong> ${data.bankDetails?.accountNumber} (${data.bankDetails?.ifscCode})</p>
                    <p style="margin: 5px 0;"><strong>Bank Name:</strong> ${data.bankDetails?.bankName}</p>
                </div>

                <p style="font-size: 13px; color: #64748b;">Review all uploaded documents and approve/reject this vendor in your Admin Dashboard.</p>
                <br />
                <p>Best Regards,<br /><strong>Spinzyt System</strong></p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};

/**
 * Sends a confirmation email to the user for Becoming a Supplier
 */
export const sendSupplierApplicationConfirmation = async (data) => {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_PORT == 465,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: `"Spinzyt Team" <${process.env.EMAIL_USER}>`,
        to: data.email,
        subject: 'We’ve received your inquiry! – Team Spinzyt',
        text: `Hi ${data.displayName},\n\nThank you for reaching out to Spinzyt and providing your details. We appreciate your interest in our platform.\n\nOur team is currently reviewing your submission, and we will get back to you as soon as possible with the next steps.\n\nSupplier Details:\nBusiness Name: ${data.supplierDetails?.businessName}\nCity: ${data.supplierDetails?.city}\nGST: ${data.supplierDetails?.gst || 'N/A'}\n\nBest regards,\nThe Spinzyt Team`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 30px;">
                <p>Hi <strong>${data.displayName}</strong>,</p>
                <p>Thank you for reaching out to <strong>Spinzyt</strong> and providing your details. We appreciate your interest in our platform.</p>
                <p>Our team is currently reviewing your submission, and we will get back to you as soon as possible with the next steps.</p>
                
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 25px 0; border: 1px solid #f1f5f9;">
                    <h3 style="margin-top: 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">Supplier Application Details</h3>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Business Name:</strong> ${data.supplierDetails?.businessName}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Location:</strong> ${data.supplierDetails?.city}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>GST Number:</strong> ${data.supplierDetails?.gst || 'N/A'}</p>
                    
                    <h3 style="margin-top: 20px; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">Bank Details</h3>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Account Holder:</strong> ${data.bankDetails?.accountHolderName}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Account Number:</strong> ${data.bankDetails?.accountNumber}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>IFSC Code:</strong> ${data.bankDetails?.ifscCode}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Bank Name:</strong> ${data.bankDetails?.bankName}</p>
                </div>

                <p style="margin-top: 25px;">Best regards,<br /><strong style="color: #0f172a;">The Spinzyt Team</strong></p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};

/**
 * Sends a notification email to the Admin for new Supplier Application
 */
export const sendAdminSupplierApplicationNotification = async (data) => {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_PORT == 465,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: `"Spinzyt System" <${process.env.EMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: `New Supplier Application: ${data.supplierDetails?.businessName}`,
        text: `New Supplier Onboarding Request!\n\nDetails:\nName: ${data.displayName}\nPhone: ${data.phone}\nEmail: ${data.email || 'N/A'}\nBusiness: ${data.supplierDetails?.businessName}\nCity: ${data.supplierDetails?.city}\n\nPlease review this in the Admin Panel.`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                <h2 style="color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">New Supplier Request!</h2>
                <p>A new supplier has registered on the platform.</p>
                
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #f1f5f9;">
                    <p style="margin: 5px 0;"><strong>Supplier Name:</strong> ${data.displayName}</p>
                    <p style="margin: 5px 0;"><strong>Phone:</strong> ${data.phone}</p>
                    <p style="margin: 5px 0;"><strong>Email:</strong> ${data.email || 'N/A'}</p>
                    <p style="margin: 5px 0;"><strong>Business Name:</strong> ${data.supplierDetails?.businessName}</p>
                    <p style="margin: 5px 0;"><strong>Location:</strong> ${data.supplierDetails?.city}</p>
                    <p style="margin: 5px 0;"><strong>Bank Account:</strong> ${data.bankDetails?.accountNumber} (${data.bankDetails?.ifscCode})</p>
                    <p style="margin: 5px 0;"><strong>Bank Name:</strong> ${data.bankDetails?.bankName}</p>
                </div>

                <p style="font-size: 13px; color: #64748b;">Review and verify this supplier in your Admin Dashboard.</p>
                <br />
                <p>Best Regards,<br /><strong>Spinzyt System</strong></p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};
