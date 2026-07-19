import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { 
    sendVendorApplicationConfirmation, 
    sendAdminVendorApplicationNotification,
    sendSupplierApplicationConfirmation,
    sendAdminSupplierApplicationNotification
} from '../utils/emailHelper.js';
import { sendWhatsAppMessage, sendSMSMessage } from '../utils/communicationHelper.js';

// Mock OTP Generator - Hardcoded to 123456 for Testing
const generateOTP = () => '123456';

export const getVendorEarnings = async (req, res) => {
    try {
        const { vendorId } = req.query;
        if (!vendorId) return res.status(400).json({ message: 'Vendor ID is required' });

        const Order = (await import('../models/Order.js')).default;
        const Payout = (await import('../models/Payout.js')).default;
        const User = (await import('../models/User.js')).default;

        const vendor = await User.findById(vendorId).select('displayName shopDetails').lean();
        if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

        // Vendor Earnings = baseWithArea + expressSurcharge from priceBreakdown
        const orders = await Order.find({ 
            vendor: vendorId,
            status: { $in: ['Ready', 'Delivered', 'Out for Delivery'] }
        }).select('priceBreakdown status orderId createdAt').lean();
        
        const totalEarnings = orders.reduce((acc, curr) => {
            const breakdown = curr.priceBreakdown || {};
            return acc + (breakdown.baseWithArea || 0) + (breakdown.expressSurcharge || 0);
        }, 0);
        
        // Total Paid by Admin to Vendor
        const payouts = await Payout.find({ vendor: vendorId, status: 'Completed' }).select('amount paidAt').lean();
        const totalPaid = payouts.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        
        const pendingBalance = totalEarnings - totalPaid;

        res.status(200).json({
            _id: vendorId,
            displayName: vendor.displayName,
            shopName: vendor.shopDetails?.name || 'N/A',
            totalOrders: orders.length,
            totalEarnings,
            totalPaid,
            pendingBalance,
            lastPayout: payouts.length > 0 ? payouts[payouts.length - 1].paidAt : null
        });
    } catch (err) {
        console.error('Get Vendor Earnings Error:', err);
        res.status(500).json({ message: 'Error fetching earnings', error: err.message });
    }
};

export const requestOtp = async (req, res) => {
    try {
        const { phone, channel, mode, customerType } = req.body; 
        const requestedRole = req.body.role || 'Customer'; // Capitalized

        // ADMIN BYPASS FOR TESTING
        if (phone === '9999999994') {
            let admin = await User.findOne({ phone });
            if (!admin) {
                return res.status(404).json({ message: 'Your number is not registered' });
            }
            admin.role = 'Admin';
            admin.status = 'approved';
            admin.otp = '123456';
            admin.otpExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
            await admin.save();
            console.log(`🛡️ [ADMIN_BYPASS] Master Admin activated for ${phone}`);
            return res.status(200).json({ message: 'Admin OTP sent successfully', role: 'Admin', mock: true });
        }

        if (!phone) {
            return res.status(400).json({ message: 'Phone number is required' });
        }

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Find User
        let user = await User.findOne({ phone });

        // Admin Protection: Disable Signup for Admin
        if (requestedRole === 'Admin' && mode === 'signup') {
            return res.status(403).json({ message: 'Admin registration is disabled.' });
        }

        // UNIFIED LOGIN LOGIC
        if (mode === 'login') {
            if (!user) {
                return res.status(404).json({ message: 'Your number is not registered' });
            }
        }

        if (mode === 'signup' && user) {
            return res.status(400).json({ message: `Account already exists as ${user.role}. Please login.` });
        }

        // If Signup and user not found, create as Customer by default
        const finalType = (req.body.customerType || customerType || 'individual').toLowerCase();
        console.log(`👤 [AUTH_TYPE] Setting Customer Type: ${finalType} for ${phone}`);

        const nameToSave = req.body.displayName || req.body.name;
        if (!user) {
            user = new User({ 
                phone, 
                role: requestedRole, // Use the role requested by the frontend
                status: requestedRole === 'Vendor' ? 'pending' : 'approved',
                customerType: finalType,
                displayName: nameToSave || ''
            });
        } else {
            if (nameToSave) {
                user.displayName = nameToSave;
            }
            if (mode === 'signup') {
                 // If for some reason user exists but trying to signup, update type
                 user.customerType = finalType;
            }
        }

        user.otp = otp;
        user.otpExpiry = otpExpiry;
        await user.save();

        // Terminal Logging
        console.log('\n----------------------------------------');
        console.log(`📡 [${channel || 'SYSTEM'}] OTP Request (UNIFIED)`);
        console.log(`📱 Phone: +91 ${phone}`);
        console.log(`🔑 OTP: ${otp}`);
        console.log(`👤 Active Role: ${user.role}`);
        console.log('----------------------------------------\n');

        res.status(200).json({ message: 'OTP sent successfully', role: user.role });
    } catch (err) {
        console.error('Request OTP Error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Comprehensive Vendor Onboarding (4-Stage)
export const becomeVendor = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            ownerName, 
            businessType, 
            facilityName, 
            panNumber, 
            aadharNumber, 
            gstNumber, 
            businessAddress,
            bankAccountName, 
            bankAccountNumber, 
            ifscCode, 
            bankName,
            serviceRates,
            location 
        } = req.body;
        
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        // Parse service rates if sent as stringified JSON
        let parsedRates = serviceRates;
        if (typeof serviceRates === 'string') {
            try { parsedRates = JSON.parse(serviceRates); } catch (e) { parsedRates = {}; }
        }

        const servicesArray = Object.keys(parsedRates || {}).map(sId => ({
            id: sId,
            vendorRate: Number(parsedRates[sId]),
            status: 'pending'
        }));

        // Basic Profile & KYV
        user.role = 'Customer'; // Keep as Customer until final approval
        user.status = 'pending';
        user.isProfileComplete = true;
        user.onboardingStage = 'INITIAL_REVIEW';
        
        user.ownerName = ownerName || user.displayName;
        user.businessType = businessType;
        user.facilityName = facilityName;
        user.panNumber = panNumber;
        user.aadharNumber = aadharNumber;
        user.gstNumber = gstNumber;
        user.businessAddress = businessAddress;
        user.displayName = facilityName || user.displayName;

        user.shopDetails = {
            name: facilityName,
            address: businessAddress,
            gst: gstNumber,
            services: servicesArray
        };

        // Handle Location
        if (location) {
            try {
                const parsedLoc = typeof location === 'string' ? JSON.parse(location) : location;
                user.location = {
                    lat: Number(parsedLoc.lat),
                    lng: Number(parsedLoc.lng)
                };
            } catch (e) {
                console.error('Location Parse Error:', e);
            }
        }

        user.bankDetails = {
            accountHolderName: bankAccountName,
            accountNumber: bankAccountNumber,
            ifscCode: ifscCode,
            bankName: bankName
        };

        // Handle File Uploads (Cloudinary URLs from Multer)
        if (req.files) {
            const files = req.files;
            if (files.panDoc) user.panDoc = files.panDoc[0].path;
            if (files.gstDoc) user.gstDoc = files.gstDoc[0].path;
            if (files.aadharDoc) user.aadharDoc = files.aadharDoc[0].path;
            if (files.msmeDoc) user.msmeDoc = files.msmeDoc[0].path;
            if (files.franchiseDoc) user.franchiseDoc = files.franchiseDoc[0].path;
            if (files.chequeDoc) user.chequeDoc = files.chequeDoc[0].path;
            if (files.exteriorPhoto) user.exteriorPhoto = files.exteriorPhoto[0].path;
            if (files.walkthroughVideo) user.walkthroughVideo = files.walkthroughVideo[0].path;
            
            if (files.interiorPhotos) {
                user.interiorPhotos = files.interiorPhotos.map(f => f.path);
            }
        }

        await user.save();
        console.log(`🚀 [VENDOR_REGISTRATION] User ${user.phone} dossier submitted for review`);

        // Send confirmation email if user has email set
        if (user.email) {
            sendVendorApplicationConfirmation(user).catch(err => {
                console.error('Vendor Application Confirmation Email Failed:', err);
            });
        }

        // Send notification email to Admin
        sendAdminVendorApplicationNotification(user).catch(err => {
            console.error('Admin Vendor Application Notification Failed:', err);
        });

        // Send WhatsApp & SMS Notification to User
        const commsMessage = "Thank you for submitting your details to Spinzyt! We have received your inquiry and our team is looking over it. We will get back to you ASAP to discuss the next steps! – The Spinzyt Team";
        
        sendWhatsAppMessage(user.phone, commsMessage).catch(err => {
            console.error('Vendor WhatsApp Notification Failed:', err);
        });

        sendSMSMessage(user.phone, commsMessage).catch(err => {
            console.error('Vendor SMS Notification Failed:', err);
        });

        res.status(200).json({ 
            message: 'Vendor application dossier submitted successfully!', 
            user: {
                id: user._id,
                role: user.role,
                status: user.status,
                onboardingStage: user.onboardingStage
            }
        });
    } catch (err) {
        console.error('Become Vendor Error:', err);
        res.status(500).json({ message: 'Internal server error during dossier submission' });
    }
};

// Phase 2: Submit selected services and rates
export const submitVendorServices = async (req, res) => {
    try {
        const { id } = req.params;
        const { services } = req.body; // Array of { id, vendorRate }

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const Service = (await import('../models/MasterService.js')).default;
        
        const servicesWithMetadata = await Promise.all(services.map(async (svc) => {
            const master = await Service.findById(svc.id);
            return {
                id: svc.id,
                name: master?.itemName || 'Unknown Service',
                icon: master?.icon || 'local_laundry_service',
                vendorRate: svc.vendorRate,
                status: 'pending'
            };
        }));

        user.shopDetails.services = servicesWithMetadata;

        user.onboardingStage = 'FINAL_REVIEW';
        await user.save();

        res.status(200).json({ message: 'Services submitted for final audit!', user });
    } catch (err) {
        console.error('Submit Services Error:', err);
        res.status(500).json({ message: 'Error submitting services' });
    }
};

// Toggle role to Supplier
export const becomeSupplier = async (req, res) => {
    console.log(`📩 [SUPPLIER_REG] Incoming request for ID: ${req.params.id}`);
    try {
        const { id } = req.params;
        const { supplierName, businessName, address, city, pincode, gst } = req.body;
        
        console.log('📦 [SUPPLIER_REG] Body received:', { supplierName, businessName, city });
        
        // Parse JSON strings if they come as stringified objects in Multipart
        let bankDetails = req.body.bankDetails;
        if (typeof bankDetails === 'string') bankDetails = JSON.parse(bankDetails);
        
        let location = req.body.location;
        if (typeof location === 'string') location = JSON.parse(location);

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.role === 'Supplier') {
            return res.status(400).json({ message: 'Already a supplier' });
        }

        user.role = 'Supplier';
        user.status = 'pending'; // Changed to pending for Admin approval flow
        user.displayName = supplierName || user.displayName;
        user.supplierDetails = {
            businessName,
            address,
            city,
            pincode,
            gst
        };
        
        if (bankDetails) {
            user.bankDetails = bankDetails;
        }

        if (location) {
            user.location = location;
        }

        // Handle Document Uploads from req.files (Cloudinary)
        const documentFiles = [];
        if (req.files) {
            if (req.files.gstCert) {
                documentFiles.push({ type: 'GST Certificate', url: req.files.gstCert[0].path });
            }
            if (req.files.udyogAadhar) {
                documentFiles.push({ type: 'Udyog Aadhar', url: req.files.udyogAadhar[0].path });
            }
            if (req.files.aadharCard) {
                documentFiles.push({ type: 'Aadhar Card', url: req.files.aadharCard[0].path });
            }
            if (req.files.addressProof) {
                documentFiles.push({ type: 'Address Proof', url: req.files.addressProof[0].path });
            }
        }
        
        if (documentFiles.length > 0) {
            user.documents = documentFiles;
        }

        user.isProfileComplete = true; // Still marked complete, but status is pending
        
        await user.save();
        console.log(`✅ [SUPPLIER_REGISTRATION] User ${user.phone} registered as Supplier (PENDING APPROVAL)`);

        // Send confirmation email to User
        if (user.email) {
            sendSupplierApplicationConfirmation(user).catch(err => {
                console.error('Supplier Application Confirmation Email Failed:', err);
            });
        }

        // Send notification email to Admin
        sendAdminSupplierApplicationNotification(user).catch(err => {
            console.error('Admin Supplier Application Notification Failed:', err);
        });

        // Send WhatsApp & SMS Notification to User
        const commsMessage = "Thank you for submitting your details to Spinzyt! We have received your inquiry and our team is looking over it. We will get back to you ASAP to discuss the next steps! – The Spinzyt Team";
        
        sendWhatsAppMessage(user.phone, commsMessage).catch(err => {
            console.error('Supplier WhatsApp Notification Failed:', err);
        });

        sendSMSMessage(user.phone, commsMessage).catch(err => {
            console.error('Supplier SMS Notification Failed:', err);
        });

        res.status(200).json({ 
            message: 'Registration successful! Waiting for Admin verification.', 
            user: {
                id: user._id,
                phone: user.phone,
                role: user.role,
                status: user.status,
                isProfileComplete: user.isProfileComplete
            }
        });
    } catch (err) {
        console.error('Become Supplier Error:', err);
        res.status(500).json({ message: 'Error upgrading to supplier' });
    }
};

export const verifyOtp = async (req, res) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({ message: 'Phone and OTP are required' });
        }

        const user = await User.findOne({ phone });

        if (!user || user.otp !== otp || new Date() > user.otpExpiry) {
            return res.status(401).json({ message: 'Invalid or expired OTP' });
        }

        // Clear OTP
        user.otp = null;
        user.otpExpiry = null;
        await user.save();

        // Generate JWT
        const token = jwt.sign(
            { id: user._id, role: user.role, phone: user.phone },
            process.env.JWT_SECRET || 'ezoflife_secret_key_2026',
            { expiresIn: '7d' }
        );

        res.status(200).json({
            message: 'OTP verified successfully',
            token,
            user
        });
    } catch (err) {
        console.error('Verify OTP Error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Complete Vendor Profile
export const completeVendorProfile = async (req, res) => {
    try {
        const { phone, shopName, address, pincode, city, gst } = req.body;
        const location = req.body.location ? JSON.parse(req.body.location) : null;
        const services = req.body.services ? JSON.parse(req.body.services) : [];
        const bankDetails = req.body.bankDetails ? JSON.parse(req.body.bankDetails) : null;

        console.log(`🚀 [PROFILE_COMPLETE] Attempting for Phone: ${phone}`);

        const user = await User.findOne({ phone, role: 'Vendor' });
        
        if (!user) {
            console.error(`❌ [PROFILE_COMPLETE] User NOT found with Phone: ${phone} and Role: Vendor`);
            // Extra check: is user there with different role?
            const anyUser = await User.findOne({ phone });
            if (anyUser) console.log(`ℹ️ [DEBUG] Found user with phone ${phone} but role is: ${anyUser.role}`);
            else console.log(`ℹ️ [DEBUG] No user at all found with phone ${phone}`);
            
            return res.status(404).json({ message: 'Vendor not found' });
        }

        // Handle File Uploads from Local Storage
        const documentFiles = [];
        if (req.files) {
            if (req.files.gstDoc) {
                documentFiles.push({ type: 'GST Document', url: req.files.gstDoc[0].path });
            }
            if (req.files.msmeDoc) {
                documentFiles.push({ type: 'MSME Document', url: req.files.msmeDoc[0].path });
            }
        }

        user.shopDetails = {
            name: shopName,
            address: address,
            pincode: pincode,
            city: city,
            gst: gst,
            services: services
        };
        user.location = location;
        user.bankDetails = bankDetails;
        user.documents = documentFiles; // Store Cloudinary URLs
        user.isProfileComplete = true;
        user.status = 'pending'; 
        await user.save();

        res.status(200).json({ message: 'Profile completed successfully. Pending approval.', user });
    } catch (err) {
        console.error('Complete Profile Error:', err);
        res.status(500).json({ message: 'Error completing profile' });
    }
};

// Get User Status
export const getStatus = async (req, res) => {
    try {
        const { phone } = req.query;
        if (!phone) return res.status(400).json({ message: 'Phone is required' });

        const user = await User.findOne({ phone, role: 'Vendor' });
        if (!user) return res.status(404).json({ message: 'Vendor not found' });

        res.status(200).json({ 
            status: user.status, 
            isProfileComplete: user.isProfileComplete 
        });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching status' });
    }
};

// Update FCM Token
export const updateFcmToken = async (req, res) => {
    try {
        const { userId, fcmToken } = req.body;
        if (!userId || !fcmToken) {
            return res.status(400).json({ message: 'User ID and FCM Token are required' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { fcmToken },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        console.log(`🔑 [FCM] Token updated for user: ${updatedUser.phone}`);
        res.status(200).json({ message: 'FCM Token updated successfully' });
    } catch (err) {
        console.error('Update FCM Token Error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Admin Login
export const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Hardcoded admin for now as per user request to not change too much
        // In a real app, we would find the user in DB and compare hashed passwords
        if (email === 'admin@ezoflife.com' && password === 'admin123') {
            let user = await User.findOne({ phone: 'ADMIN_SYSTEM', role: 'Admin' });
            if (!user) {
                user = new User({ phone: 'ADMIN_SYSTEM', role: 'Admin', displayName: 'System Admin' });
                await user.save();
            }

            const token = jwt.sign(
                { id: user._id, role: user.role, phone: user.phone },
                process.env.JWT_SECRET || 'ezoflife_secret_key_2026',
                { expiresIn: '7d' }
            );

            return res.status(200).json({
                message: 'Admin login successful',
                token,
                user: {
                    id: user._id,
                    phone: user.phone,
                    role: user.role,
                    displayName: user.displayName
                }
            });
        }

        // Dynamic Sub-Admin login checking
        const subAdmin = await User.findOne({ email, role: 'Admin' });
        if (subAdmin && subAdmin.password) {
            if (subAdmin.status !== 'approved') {
                return res.status(403).json({ message: `Your sub-admin account status is currently: ${subAdmin.status}.` });
            }

            const isMatch = await bcrypt.compare(password, subAdmin.password);
            if (isMatch) {
                const token = jwt.sign(
                    { id: subAdmin._id, role: subAdmin.role, phone: subAdmin.phone },
                    process.env.JWT_SECRET || 'ezoflife_secret_key_2026',
                    { expiresIn: '7d' }
                );

                return res.status(200).json({
                    message: 'Admin login successful',
                    token,
                    user: {
                        id: subAdmin._id,
                        phone: subAdmin.phone,
                        role: subAdmin.role,
                        displayName: subAdmin.displayName,
                        email: subAdmin.email,
                        adminRole: subAdmin.adminRole,
                        adminPermissions: subAdmin.adminPermissions || [],
                        adminAccessType: subAdmin.adminAccessType || 'Read/Write'
                    }
                });
            }
        }

        return res.status(401).json({ message: 'Invalid admin credentials' });
    } catch (err) {
        console.error('Admin Login Error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Profile Management
export const getUserProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).lean();
        if (!user) return res.status(404).json({ message: 'User not found' });

        // If Vendor, merge/map service details for clear UI
        if (user.role === 'Vendor' && user.shopDetails?.services) {
            const MasterService = (await import('../models/MasterService.js')).default;
            const masterServices = await MasterService.find().lean();
            
            user.shopDetails.services = user.shopDetails.services.map(svc => {
                const master = masterServices.find(m => m._id.toString() === svc.id || m.id === svc.id);
                return {
                    ...svc,
                    name: master ? master.itemName : `Service ${svc.id.slice(-4)}`,
                    icon: master ? master.icon : 'local_laundry_service'
                };
            });
        }

        res.status(200).json(user);
    } catch (err) {
        console.error('Get Profile Error:', err);
        res.status(500).json({ message: 'Error fetching profile' });
    }
};

export const updateUserProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Surgical update using Mongoose .set() to ensure nested paths are tracked
        Object.keys(updates).forEach(key => {
            if (typeof updates[key] === 'object' && updates[key] !== null && !Array.isArray(updates[key])) {
                // For objects, we can merge or use path notation. Path notation is safer.
                Object.keys(updates[key]).forEach(subKey => {
                    user.set(`${key}.${subKey}`, updates[key][subKey]);
                });
            } else {
                user.set(key, updates[key]);
            }
        });

        // ROLE-AWARE SYNC: If root address/pincode/city is updated, sync to specific details
        if (updates.address || updates.pincode || updates.city) {
            if (user.role === 'Vendor') {
                user.shopDetails = {
                    ...user.shopDetails,
                    address: updates.address || user.shopDetails.address,
                    pincode: updates.pincode || user.shopDetails.pincode,
                    city: updates.city || user.shopDetails.city
                };
            } else if (user.role === 'Supplier') {
                user.supplierDetails = {
                    ...user.supplierDetails,
                    address: updates.address || user.supplierDetails.address,
                    pincode: updates.pincode || user.supplierDetails.pincode,
                    city: updates.city || user.supplierDetails.city
                };
            }
        }

        if (updates.location) {
            console.log(`\n\x1b[36m📍 [ADDRESS UPDATE] Customer/Vendor Role: ${user.role} | Phone: ${user.phone}\x1b[0m`);
            console.log(`\x1b[33m   Coordinates Received (Default):\x1b[0m`, updates.location);
        }
        if (updates.addresses && Array.isArray(updates.addresses)) {
            updates.addresses.forEach((addr, idx) => {
                if (addr.location) {
                    console.log(`\x1b[33m   Address [${idx}] (${addr.type}) Coordinates:\x1b[0m`, addr.location);
                }
            });
        }

        await user.save();
        res.status(200).json(user);
    } catch (err) {
        console.error('Update Profile Error:', err);
        res.status(500).json({ message: 'Error updating profile', error: err.message });
    }
};

export const updateVendorDocuments = async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ message: 'No document file uploaded' });
        }

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const newDoc = {
            type,
            url: req.file.path // Cloudinary URL
        };

        // Find if document of same type exists
        const existingDocIdx = user.documents.findIndex(d => d.type === type);
        
        if (existingDocIdx > -1) {
            // Replace existing
            user.documents[existingDocIdx] = newDoc;
        } else {
            // Add new
            user.documents.push(newDoc);
        }

        await user.save();
        res.status(200).json(user);
    } catch (err) {
        console.error('Update Documents Error:', err);
        res.status(500).json({ message: 'Error updating documents' });
    }
};

export const updateProfileImage = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) {
            return res.status(400).json({ message: 'No image file uploaded' });
        }

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.image = req.file.path; // Cloudinary URL
        await user.save();
        
        res.status(200).json(user);
    } catch (err) {
        console.error('Update Profile Image Error:', err);
        res.status(500).json({ message: 'Error updating profile image' });
    }
};

// Admin registering a vendor
export const registerVendor = async (req, res) => {
    try {
        const { name, mobile, email, gstNumber, password, address } = req.body;

        if (!name || !mobile || !email || !password) {
            return res.status(400).json({ message: 'Name, mobile, email and password are required' });
        }

        // Check if vendor already exists
        const existingUser = await User.findOne({ $or: [{ phone: mobile }, { email }] });
        if (existingUser) {
            return res.status(400).json({ message: 'Vendor with this mobile or email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const newVendor = new User({
            displayName: name,
            phone: mobile,
            email,
            password: hashedPassword,
            role: 'Vendor',
            status: 'approved', // Admin registered vendors are auto-approved
            address: address, // Main user address
            shopDetails: {
                name: name,
                address: address,
                gst: gstNumber,
                services: []
            },
            isProfileComplete: true
        });

        await newVendor.save();

        res.status(201).json({
            message: 'Vendor registered successfully',
            vendor: {
                id: newVendor._id,
                name: newVendor.displayName,
                email: newVendor.email,
                phone: newVendor.phone
            }
        });
    } catch (err) {
        console.error('Register Vendor Error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Vendor login with password
export const vendorLogin = async (req, res) => {
    try {
        const { identifier, password } = req.body; // identifier can be email or phone

        if (!identifier || !password) {
            return res.status(400).json({ message: 'Email/Phone and password are required' });
        }

        const user = await User.findOne({ 
            $or: [{ email: identifier }, { phone: identifier }],
            role: 'Vendor'
        });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (user.status !== 'approved') {
            return res.status(403).json({ message: `Your account status is: ${user.status}. Access denied.` });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user._id, role: user.role, phone: user.phone },
            process.env.JWT_SECRET || 'ezoflife_secret_key_2026',
            { expiresIn: '7d' }
        );

        res.status(200).json({
            message: 'Vendor login successful',
            token,
            user: {
                id: user._id,
                phone: user.phone,
                email: user.email,
                role: user.role,
                displayName: user.displayName,
                status: user.status,
                isProfileComplete: user.isProfileComplete,
                shopDetails: user.shopDetails
            }
        });
    } catch (err) {
        console.error('Vendor Login Error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const tempSeedUser = async (req, res) => {
    try {
        const phone = '9926723112';
        const otp = '123456';
        let user = await User.findOne({ phone });
        
        if (user) {
            user.otp = otp;
            user.otpExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await user.save();
            return res.status(200).json({ message: 'User updated successfully', user });
        } else {
            user = new User({
                phone,
                otp,
                otpExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
                role: 'Customer',
                status: 'approved',
                isProfileComplete: false
            });
            await user.save();
            return res.status(201).json({ message: 'User created successfully', user });
        }
    } catch (err) {
        console.error('Seed Error:', err);
        res.status(500).json({ message: 'Seed failed', error: err.message });
    }
};

export const getDraftCart = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).select('draftCart');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(user.draftCart || {});
    } catch (err) {
        console.error('Get Cart Error:', err);
        res.status(500).json({ message: 'Error fetching cart' });
    }
};

export const updateDraftCart = async (req, res) => {
    try {
        const { id } = req.params;
        const { cart } = req.body;
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        user.draftCart = cart;
        await user.save();
        res.status(200).json({ message: 'Cart updated successfully', cart: user.draftCart });
    } catch (err) {
        console.error('Update Cart Error:', err);
        res.status(500).json({ message: 'Error updating cart' });
    }
};

export const lookupCustomerByPhone = async (req, res) => {
    try {
        const { phone } = req.params;
        const customer = await User.findOne({ phone: new RegExp(phone.slice(-10) + '$') });
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        
        if (customer.role !== 'Customer') {
            return res.status(400).json({ 
                message: `This phone number is registered as a ${customer.role}. Only Customer accounts are allowed.` 
            });
        }

        let defAddr = customer.addresses && customer.addresses.length > 0 ? customer.addresses[0] : null;
        res.status(200).json({ 
            id: customer._id,
            displayName: customer.displayName || '',
            type: defAddr ? defAddr.type : 'Home',
            address: defAddr ? defAddr.address : (customer.address || ''),
            city: defAddr ? defAddr.city : (customer.city || ''),
            state: defAddr ? (defAddr.state || '') : (customer.state || ''),
            pincode: defAddr ? defAddr.pincode : (customer.pincode || ''),
            lat: defAddr ? defAddr.location?.lat : (customer.location?.lat || null),
            lng: defAddr ? defAddr.location?.lng : (customer.location?.lng || null),
            isRegistered: true
        });
    } catch (err) {
        console.error('Lookup Phone Error:', err);
        res.status(500).json({ message: 'Error looking up customer' });
    }
};

// Invite a new sub-admin (called by Master Admin)
export const inviteSubAdmin = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, role, accessType, geofences } = req.body;

        if (!firstName || !lastName || !email || !phone || !role) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check if phone or email already registered
        const existingUser = await User.findOne({ $or: [{ phone }, { email }] });
        if (existingUser) {
            return res.status(400).json({ message: 'A user with this phone or email already exists' });
        }

        // Generate activation details
        const activationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
        const otpExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Map role permissions based on matrix
        let permissions = [];
        if (role === 'Master Admin') {
            permissions = ['Dashboard', 'User Management', 'Registration Approval', 'Vendor Service Request', 'Supplier Product Request', 'Orders', 'Services & Pricing', 'Vendor Supply Pricing', 'Support Tickets', 'Notifications', 'FAQ Manager', 'Privacy Policy', 'Terms & Conditions', 'Splash Ads', 'Advertise', 'Referral Settings', 'Promotions', 'Partnerships', 'Customer Feedback', 'Career Center', 'Settings', 'Invoice Design'];
        } else if (role === 'Global Auditor / Developer') {
            permissions = ['Dashboard', 'User Management', 'Registration Approval', 'Vendor Service Request', 'Supplier Product Request', 'Orders', 'Services & Pricing', 'Vendor Supply Pricing', 'Support Tickets', 'Notifications', 'FAQ Manager', 'Privacy Policy', 'Terms & Conditions', 'Splash Ads', 'Advertise', 'Referral Settings', 'Promotions', 'Partnerships', 'Customer Feedback', 'Career Center', 'Settings', 'Invoice Design'];
        } else if (role === 'Operations & Pricing Lead') {
            permissions = ['Dashboard', 'Registration Approval', 'Vendor Service Request', 'Supplier Product Request', 'Orders'];
        } else if (role === 'Customer Support Executive') {
            permissions = ['User Management', 'Orders', 'Support Tickets', 'FAQ Manager'];
        } else if (role === 'Logistics & Shipping Coordinator') {
            permissions = ['Orders', 'Support Tickets', 'Notifications'];
        } else if (role === 'Growth & Marketing Admin') {
            permissions = ['Splash Ads', 'Advertise', 'Referral Settings', 'Promotions', 'Partnerships'];
        } else if (role === 'HR') {
            permissions = ['User Management', 'Support Tickets', 'FAQ Manager', 'Career Center', 'Invoice Design', 'Customer Feedback'];
        } else {
            // Custom role
            permissions = req.body.permissions || [];
        }

        // Save placeholder sub-admin to DB
        const newAdmin = new User({
            phone,
            email,
            role: 'Admin',
            displayName: `${firstName} ${lastName}`,
            status: 'pending',
            adminRole: role,
            adminPermissions: permissions,
            adminAccessType: accessType || 'Read/Write',
            geofenceRestrictions: geofences || [],
            otp,
            otpExpiry,
            activationToken
        });
        
        await newAdmin.save();

        // Generate activation link
        const activationLink = `http://localhost:5173/admin/activate?token=${activationToken}`;

        // 1. Send Whatsapp Message Mock to backend terminal
        console.log('\n----------------------------------------');
        console.log('🟢 [WHATSAPP MOCK] Sub-Admin Invitation');
        console.log(`📱 Phone: +91 ${phone}`);
        console.log(`👤 Name: ${firstName} ${lastName}`);
        console.log(`🔑 Verification OTP: ${otp}`);
        console.log(`🔗 Link: ${activationLink}`);
        console.log('----------------------------------------\n');

        // 2. Send email using helper
        try {
            const { sendSubAdminActivationEmail } = await import('../utils/emailHelper.js');
            await sendSubAdminActivationEmail(email, firstName, activationLink, otp);
            console.log(`📧 [EMAIL] Sent sub-admin invitation email to ${email}`);
        } catch (emailErr) {
            console.error('❌ Failed to send sub-admin activation email:', emailErr.message);
        }

        res.status(201).json({
            success: true,
            message: 'Sub-admin invited successfully. Check terminal for WhatsApp mock and email logs.',
            activationLink,
            otp
        });

    } catch (err) {
        console.error('Invite Sub-Admin Error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

// Fetch sub-admin activation details by token (Public GET)
export const getSubAdminActivationDetails = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ message: 'Token is required' });
        }

        const user = await User.findOne({ activationToken: token, role: 'Admin' });
        if (!user) {
            return res.status(404).json({ message: 'Invalid or expired invitation link' });
        }

        res.status(200).json({
            email: user.email,
            phone: user.phone,
            displayName: user.displayName,
            adminRole: user.adminRole
        });
    } catch (err) {
        console.error('Get Activation Details Error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Activate sub-admin (sets password and verifies via OTP) (Public POST)
export const activateSubAdmin = async (req, res) => {
    try {
        const { token, password, otp } = req.body;

        if (!token || !password || !otp) {
            return res.status(400).json({ message: 'Token, password, and OTP are required' });
        }

        const user = await User.findOne({ activationToken: token, role: 'Admin' });
        if (!user) {
            return res.status(404).json({ message: 'Invalid or expired activation token' });
        }

        // Verify OTP
        if (user.otp !== otp) {
            return res.status(400).json({ message: 'Invalid verification OTP' });
        }

        if (new Date() > user.otpExpiry) {
            return res.status(400).json({ message: 'Verification OTP has expired' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update user status and credentials
        user.password = hashedPassword;
        user.status = 'approved';
        user.otp = null;
        user.otpExpiry = null;
        user.activationToken = null;

        await user.save();

        console.log(`🔓 [SUB_ADMIN] Account activated successfully for: ${user.email}`);

        res.status(200).json({
            success: true,
            message: 'Account activated successfully! You can now log in using your password.'
        });
    } catch (err) {
        console.error('Activate Sub-Admin Error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};
