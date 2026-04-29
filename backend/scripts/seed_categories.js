import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../src/models/Category.js';

dotenv.config();

const categoriesData = [
    { main: "Dry Cleaning", subs: ["Household", "Woolen", "Daily", "Ethnic"] },
    { main: "Organic DryCleaning", subs: ["Daily", "Ethnic", "Woolen", "Household"] },
    { main: "Leather Jacket Cleaning", subs: ["Leather Jacket Cleaning"] },
    { main: "Shoes", subs: ["Shoes"] },
    { main: "Bags", subs: ["Bags"] },
    { main: "MISC", subs: ["Misc"] },
    { main: "Sofa", subs: ["Sofa"] },
    { main: "Carpet", subs: ["Carpet"] },
    { main: "Wash", subs: ["Regular Wash", "Organic Wash", "Woolen"] },
    { main: "Wash + Iron", subs: ["Regular Wash+Iron Service", "Organic Wash+Iron Service", "Curtain Wash Service (Wash And Iron)"] },
    { main: "Wash + Iron + Collar & Cuff Cleaning", subs: ["Premium Laundry Service"] },
    { main: "Steam IRON", subs: ["Daily", "Ethnic", "Woolen", "Household"] }
];

const seed = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected!');

        // Clear existing categories first
        await Category.deleteMany({});
        console.log('Cleared existing categories.');

        for (const item of categoriesData) {
            console.log(`Processing Main Category: ${item.main}`);
            
            // Create Main Category
            const mainCat = await new Category({
                name: item.main,
                parentCategory: null,
                image: ''
            }).save();

            // Create Sub Categories (if different from main)
            for (const subName of item.subs) {
                if (subName !== item.main) {
                    await new Category({
                        name: subName,
                        parentCategory: mainCat._id,
                        image: ''
                    }).save();
                    console.log(`  - Added Sub: ${subName}`);
                }
            }
        }

        console.log('SUCCESS: All categories seeded!');
        process.exit(0);
    } catch (error) {
        console.error('SEED ERROR:', error);
        process.exit(1);
    }
};

seed();
