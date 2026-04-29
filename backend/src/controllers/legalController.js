import LegalDocument from '../models/LegalDocument.js';

export const getLegalDocument = async (req, res) => {
    try {
        const { type } = req.params;
        const doc = await LegalDocument.findOne({ type });
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }
        res.status(200).json(doc);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateLegalDocument = async (req, res) => {
    try {
        const { type } = req.params;
        const { content, pdfUrl } = req.body;
        
        let doc = await LegalDocument.findOne({ type });
        
        if (doc) {
            doc.content = content !== undefined ? content : doc.content;
            doc.pdfUrl = pdfUrl !== undefined ? pdfUrl : doc.pdfUrl;
            doc.lastUpdated = Date.now();
            await doc.save();
        } else {
            doc = new LegalDocument({ type, content, pdfUrl });
            await doc.save();
        }
        
        res.status(200).json(doc);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getAllLegalDocuments = async (req, res) => {
    try {
        const docs = await LegalDocument.find();
        res.status(200).json(docs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
