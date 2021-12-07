import { MongoClient } from "mongodb";
import bcrypt from 'bcrypt'

export async function genPassword(password) {
    const NO_OF_ROUNDS = 10;
    const salt = await bcrypt.genSalt(NO_OF_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
}

export async function createConnection() {
    const client = new MongoClient(process.env.MONGO_URL);
    await client.connect();
    console.log("MongoDB connected");
    return client;
}



