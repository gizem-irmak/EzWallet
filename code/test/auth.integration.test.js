import request from 'supertest';
import { app } from '../app';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
const bcrypt = require("bcryptjs")
import mongoose, { Model } from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

beforeAll(async () => {

   const dbName = "testingDatabaseAuth";
   const url = `${process.env.MONGO_URI}/${dbName}`;

   await mongoose.connect(url, {
     useNewUrlParser: true,
     useUnifiedTopology: true,
   });

});

afterAll(async () => {
   await mongoose.connection.db.dropDatabase();
   await mongoose.connection.close();
});



describe('register', () => {

   afterEach(async () => {
     await User.deleteMany();
   });


   it('should register a new user successfully', async () => {

     const requestBody = {username: "New", email: "newexample@example.com", password: "securePass"}; 
     const response = await request(app)
      .post('/api/register')
      .send(requestBody);

     expect(response.status).toBe(200);
     expect(response.body.data.message).toBe('User added successfully');

     const user = await User.findOne({ email: 'newexample@example.com' });

     expect(user).toBeDefined();
     expect(user.username).toBe('New');

   });


   it('should returns a 400 error if the request body does not contain all the necessary attributes', async () => {

     const requestBody = {};
     const response = await request(app)
      .post('/api/register')
      .send(requestBody);

     expect(response.status).toBe(400);
     expect(response.body.error).toBe("validation error");

   });


   it('should return a 400 error if at least one of the parameters in the request body is an empty string', async () => {

     const requestBody = {username: "New", email: "", password: "securePass"};
     const response = await request(app)
      .post('/api/register')
      .send(requestBody);

     expect(response.status).toBe(400);
     expect(response.body.error).toBe("validation error");

   });


   it('should return a 400 error if the email in the request body is not in a valid email format', async () => {

     const requestBody = {username: "New", email: "invalid-format", password: "securePass"};
     const response = await request(app)
      .post('/api/register')
      .send(requestBody);

     expect(response.status).toBe(400);
     expect(response.body.error).toBe("validation error");

   });


   it('should returns a 400 error if the username in the request body identifies an already existing user', async () => {

     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
     const requestBody = {username: "user1", email: "user1@example.com", password: "securePass"};
     const response = await request(app)
      .post('/api/register')
      .send(requestBody);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('you are already registered');
     
   });


});



describe('registerAdmin', () => {

   afterEach(async () => {
    // Clean up the test data
    await User.deleteMany();
   });

   it('should register an admin user successfully', async () => {

    const requestBody = {username: "admin", email: "admin@example.com", password: "securePass"};
    
    const response = await request(app)
      .post('/api/admin')
      .send(requestBody);

    expect(response.status).toBe(200);
    expect(response.body.data.message).toBe('Admin added successfully');

     const user = await User.findOne({ email: 'admin@example.com' });
     expect(user).toBeDefined();
     expect(user.username).toBe('admin');
   });

   it('should return a 400 error if the request body does not contain all the necessary attributes', async () => {

    const requestBody = {};
    
    const response = await request(app)
      .post('/api/admin')
      .send(requestBody);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("validation error");
   
   });

   it('should return a 400 error if at least one of the parameters in the request body is an empty string', async () => {

    const requestBody = {username: "", email: "admin@example.com", password: "securePass"};
    
    const response = await request(app)
      .post('/api/admin')
      .send(requestBody);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("validation error");
   
   });
  
   it('should return a 400 error if the email in the request body is not in a valid email format', async () => {

    const requestBody = {username: "", email: "invalid-format", password: "securePass"};
    
    const response = await request(app)
      .post('/api/admin')
      .send(requestBody);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("validation error");
   
   });

   it('should return a 400 error if the username in the request body identifies an already existing user', async () => {

    const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
    await user1.save()

    const requestBody = {username: "user1", email: "user1@example.com", password: "securePass"};
    
    const response = await request(app)
      .post('/api/admin')
      .send(requestBody);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('you are already registered');
   
   });

   it('should return a 400 error if the email in the request body identifies an already existing user', async () => {

    const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
    await user1.save()

    const requestBody = {username: "admin", email: "user1@example.com", password: "securePass"};
    
    const response = await request(app)
      .post('/api/admin')
      .send(requestBody);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('you are already registered');
   
   });
 
});


describe('login', () => {

   afterEach(async () => {
    await User.deleteMany();
   });

   it('should login a user and return access and refresh tokens', async () => {

     const requestBody = {username: "New", email: "newexample@example.com", password: "securePass"};
     await request(app)
      .post('/api/register')
      .send(requestBody);

     const response = await request(app)
      .post('/api/login')
      .send({ email: 'newexample@example.com', password: 'securePass' });

     expect(response.statusCode).toBe(200);

   });


   it('should return a 400 error if the request body does not contain all the necessary attributes', async () => {

     const requestBody = {username: "New", email: "newexample@example.com", password: "securePass"};
     await request(app)
      .post('/api/register')
      .send(requestBody);

     const response = await request(app)
      .post('/api/login')
      .send({});

     expect(response.statusCode).toBe(400);
     expect(response.body.error).toBe("validation error");

   });


   it('should return a 400 error if at least one of the parameters in the request body is an empty string', async () => {

     const requestBody = {username: "New", email: "newexample@example.com", password: "securePass"};
    
     await request(app)
      .post('/api/register')
      .send(requestBody);

     const response = await request(app)
      .post('/api/login')
      .send({ email: '', password: 'securePass' });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe("validation error");

   });


   it('should return a 400 error if the email in the request body is not in a valid email format', async () => {

     const requestBody = {username: "New", email: "newexample@example.com", password: "securePass"};
     await request(app)
      .post('/api/register')
      .send(requestBody);

     const response = await request(app)
      .post('/api/login')
      .send({ email: 'invalid-format', password: 'securePass' });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe("validation error");

   });


   it('should returns a 400 error if the email in the request body does not identify a user in the database', async () => {

     const requestBody = {username: "New", email: "newexample@example.com", password: "securePass"};
     await request(app)
      .post('/api/register')
      .send(requestBody);

     const response = await request(app)
      .post('/api/login')
      .send({ email: 'user@example.com', password: 'securePass' });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe("please you need to register");

   });


   it('should return a 400 error if the supplied password does not match with the one in the database', async () => {

     const requestBody = {username: "New", email: "newexample@example.com", password: "securePass"};
     await request(app)
      .post('/api/register')
      .send(requestBody);

     const response = await request(app)
      .post('/api/login')
      .send({ email: 'newexample@example.com', password: 'wrongpass' });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe('wrong credentials');

   });


});



describe('logout', () => {

   afterEach(async () => {
    await User.deleteMany();
   });


   it('should log out a user and clear access and refresh tokens', async () => {

     const accessToken = jwt.sign({ username: 'New', email: 'newexample@example.com', role: 'Simple' }, process.env.ACCESS_KEY);
     const refreshToken = jwt.sign({ username: 'New', email: 'newexample@example.com', role: 'Simple' }, process.env.ACCESS_KEY, { expiresIn: '7d' });

     const user = {username: "New", email: "newexample@example.com", password: "securePass", refreshToken: refreshToken};
     
     User.create(user);

     const response = await request(app)
      .get('/api/logout')
      .set('Cookie', `accessToken=${accessToken}; refreshToken=${refreshToken}`)
      .send();

     expect(response.statusCode).toBe(200);
     expect(response.body.data.message).toBe("Logged out")

   });


   it('should returns a 400 error if if the refresh token in the requests cookies does not represent a user in the database', async () => {

     const requestBody = {username: "New", email: "newexample@example.com", password: "securePass"};
     const accessToken = jwt.sign({ username: 'New1', email: 'new@example.com', role: 'Simple' }, process.env.ACCESS_KEY);
     const refreshToken = jwt.sign({ username: 'New1', email: 'new@example.com', role: 'Simple' }, process.env.ACCESS_KEY, { expiresIn: '7d' });

     await request(app)
      .post('/api/register')
      .send(requestBody);

     await request(app)
      .post('/api/login')
      .send({ email: 'newexample@example.com', password: 'securePass' });

     const response = await request(app)
      .get('/api/logout')
      .set('Cookie', `accessToken=${accessToken}; refreshToken=${refreshToken}`)
      .send();

     expect(response.statusCode).toBe(400);
     expect(response.body.error).toBe("User not found");
    
   });

    
})




