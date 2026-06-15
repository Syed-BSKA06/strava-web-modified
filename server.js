import express from 'express';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();
const app = express();
const PORT = 3000;
app.use(express.static('public'));
app.use(express.json())
//------ STRAVA AUTH-----//




