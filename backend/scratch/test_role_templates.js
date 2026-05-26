import mongoose from 'mongoose';
import dotenv from 'dotenv';
import RoleTemplate from '../src/models/RoleTemplate.js';
import { createRoleTemplate, updateRoleTemplate } from '../src/controllers/roleTemplateController.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://ashutoshbankey21306_db_user:fzx3knNMlyguewFZ@cluster0.dyxvq4j.mongodb.net/test?appName=Cluster0";

async function testRoleTemplates() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    try {
        // Clean up previous test role template
        await RoleTemplate.deleteOne({ name: 'Test QA Specialist' });
        await RoleTemplate.deleteOne({ name: 'Test Invalid Specialist' });

        console.log('\n--- 1. Testing Successful Template Creation ---');
        const req = {
            body: {
                name: 'Test QA Specialist',
                description: 'Verify quality and correctness of laundry and cleaning systems.',
                responsibilities: [
                    'Perform systematic inspection of ironed garments to find defects.',
                    'Log daily quality metrics and document compliance reports.'
                ]
            }
        };

        let createdData = null;
        const res = {
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                this.jsonData = data;
                return this;
            }
        };

        await createRoleTemplate(req, res);
        console.log('Response Status:', res.statusCode || 201);
        console.log('Created Template Data:', res.jsonData);

        if (res.jsonData && res.jsonData.name === 'Test QA Specialist') {
            console.log('✅ Successful Template Creation Test Passed!');
            createdData = res.jsonData;
        } else {
            console.error('❌ Successful Template Creation Test Failed!');
        }

        console.log('\n--- 2. Testing 50-Word Limit Validation (Exceeding Limit) ---');
        // Construct a bullet point with more than 50 words
        const tooManyWords = Array(55).fill('word').join(' ');
        const reqInvalid = {
            body: {
                name: 'Test Invalid Specialist',
                description: 'This template has a bullet that exceeds 50 words.',
                responsibilities: [
                    'Normal bullet point',
                    tooManyWords
                ]
            }
        };

        const resInvalid = {
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                this.jsonData = data;
                return this;
            }
        };

        await createRoleTemplate(reqInvalid, resInvalid);
        console.log('Response Status (Expected: 400):', resInvalid.statusCode);
        console.log('Response Message:', resInvalid.jsonData?.message);

        if (resInvalid.statusCode === 400 && resInvalid.jsonData?.message?.includes('exceeds the limit of 50 words')) {
            console.log('✅ Word Count Validation (Error Block) Test Passed!');
        } else {
            console.error('❌ Word Count Validation (Error Block) Test Failed!');
        }

        if (createdData) {
            console.log('\n--- 3. Testing Template Update ---');
            const reqUpdate = {
                params: { id: createdData._id },
                body: {
                    name: 'Test QA Specialist Updated',
                    description: 'Updated description here.',
                    responsibilities: [
                        'Only one updated bullet point now.'
                    ]
                }
            };

            const resUpdate = {
                status: function(code) {
                    this.statusCode = code;
                    return this;
                },
                json: function(data) {
                    this.jsonData = data;
                    return this;
                }
            };

            await updateRoleTemplate(reqUpdate, resUpdate);
            console.log('Response Status (Expected: 200 or undefined):', resUpdate.statusCode || 200);
            console.log('Updated Data:', resUpdate.jsonData);

            if (resUpdate.jsonData && resUpdate.jsonData.name === 'Test QA Specialist Updated') {
                console.log('✅ Template Update Test Passed!');
            } else {
                console.error('❌ Template Update Test Failed!');
            }

            // Cleanup
            await RoleTemplate.deleteOne({ _id: createdData._id });
            console.log('Cleaned up created test documents.');
        }

    } catch (e) {
        console.error('Test execution error:', e);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

testRoleTemplates();
