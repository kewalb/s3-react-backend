import express from 'express';
import dotenv from 'dotenv';
import AWS from 'aws-sdk';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import cors from 'cors';
import { auth } from './middleware/auth.js';
import { genPassword, createConnection } from './helper.js';
import S3 from 'aws-sdk';

const app = express()

//setting environment variables
dotenv.config()
console.log(process.env.PORT)

//middleware
app.use(express.json())
app.use(cors())

// const config = {
//     bucketName: process.env.S3_BUCKET,
//     region: process.env.REGION,
//     accessKeyId: process.env.ACCESS_KEY,
//     secretAccessKey: process.env.SECRET_ACCESS_KEY,
// }

// AWS.config.update({
//     accessKeyId: process.env.ACCESS_KEY,
//     secretAccessKey: process.env.SECRET_ACCESS_KEY
// })

// const myBucket = new AWS.S3({
//     params: { Bucket: process.env.S3_BUCKET},
//     region: process.env.REGION,
// })
const URL = "localhost:9000"
const client = await createConnection()

app.get("/", auth, (request, response) => {
    response.status(200).send({"msg":"Hello World!"})
})

app.post("/user/register", async (request, response) => {
    // const status = "inactive"
    const {username, password, firstName, lastName} = request.body
    const user = await client.db('s3-react').collection('users').findOne({username: username})
    console.log(user)
    if(user!=null){
        response.status(400).send({"message": "Try with different username"})
    }
    else{
        const hashedPassword = await genPassword(password)
        // const verificationToken = await VerificationToken.create({ username: username, token: bcrypt.salt(10), createdat: new Date(), updatedat: new Date() })
        let jwtTokenEmailVerify = jwt.sign({ email: username }, 'secret', { expiresIn: "1h" });
        const data = {
            username: username,
            password: hashedPassword,
            firstName: firstName,
            lastName: lastName,
            status: false,
            tempToken: jwtTokenEmailVerify,
            files: []
        }
        client.db('s3-react').collection('users').insertOne(data)
        let transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            auth: {
              user: process.env.USERNAME1, 
              pass: process.env.PASSWORD,
            },
          });
          console.log("Hello",process.env.USERNAME1, process.env.PASSWORD)
          // send mail with defined transport object
          let mailOptions = {
            from: 'no-reply@example.com', // sender address
            to: username, // list of receivers
            subject: "Account verification", // Subject line
            text: 'Please verify your account by clicking the link: \nhttp:\/\/' + URL + '\/verify?username=' + username + '&token=' + jwtTokenEmailVerify + '\n\nThank You!\n'
          };
         transporter.sendMail(mailOptions)
        response.status(200).send({"message": `You have Registered Successfully, Activation link sent to: ${username}`})
    }
})


app.get("/verify", async (request, response) => {
    const {username, token} = request.query
    const user = await client.db('s3-react').collection('users').findOne({username:username})
    console.log(user)
    if(user.tempToken === token){
        await client.db('s3-react').collection('users').updateOne({username:username}, {$set:{status: true, tempToken:""}})
        response.status(200).send("Registered Successfully")
    }
    else if(user.status === true && user.tempToken === ""){
        response.send("Already Registered")
    }
    else{
        response.status(400).send("Bad Request Try again")
    }
})


app.post("/login", async (request, response) => {
    const {username, password} = request.body
    const user = await client.db('s3-react').collection('users').findOne({username:username})
    if(!user){
        response.send({"message": "Invalid Credentials", username: username});
        return
    }
    const storedPassword = user.password
    const isPasswordMatch = await bcrypt.compare(password, storedPassword)
    if(isPasswordMatch && user.status === true){
        const token = jwt.sign({id: user._id}, process.env.SECRET_KEY)
        response.status(200).send({"message":"login Successful", "token":token})
    }
    else{
        response.send({"message": "Invalid Credentials", username: username});
    }

})

const bucketName = process.env.S3_BUCKET
const region = process.env.REGION
const accessKeyId = process.env.ACCESS_KEY
const secretAccessKey = process.env.SECRET_ACCESS_KEY

const s3 = new S3({
    region, 
    accessKeyId,
    secretAccessKey
})

//upload a file to s3
app.post("/upload", (request, response) => {
    const data = request.body
    console.log(data)
    response.send(data)
})

app.listen(9000)