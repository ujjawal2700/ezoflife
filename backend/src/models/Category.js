import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    mainCategory: {
        type: String,
        required: true,
        trim: true
    },
    subCategory: {
        type: String,
        required: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    image: {
        type: String
    },
    excelCategoryId: {
        type: Number
    }
}, { timestamps: true });

const Category = mongoose.model('Category', categorySchema);

export default Category;
