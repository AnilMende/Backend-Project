import dotenv from 'dotenv';
dotenv.config({
    path : './env'
})
import { app } from './app.js';

import connectDB from './db/index.js';

connectDB()
.then(() => {
    app.listen(process.env.PORT, () => {
        console.log(`Server is running at PORT : ${process.env.PORT}`);
    })
})
.catch((error) => {
    console.log('MongoDB Connection error', error);
})